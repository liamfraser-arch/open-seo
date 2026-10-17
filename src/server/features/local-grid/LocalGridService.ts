import { z } from "zod";
import type { BillingCustomerContext } from "@/server/billing/subscription";
import { LocalGridRepository } from "@/server/features/local-grid/LocalGridRepository";
import {
  createDataforseoClient,
  fetchLocalSerpTaskResult,
} from "@/server/lib/dataforseo";
import { AppError } from "@/server/lib/errors";
import { formatLocalSerpCoordinate } from "@/server/mcp/tools/local-seo-shared";
import {
  buildRankGridPoints,
  LOCAL_GRID_DEPTH,
  rankGridZoom,
  summarizeLocalGridRanks,
} from "@/shared/local-grid";
import type { CreateLocalGridInput } from "@/types/schemas/local-grid";

// Each collect call polls at most this many tasks, which keeps a 9x9 grid
// inside the Workers subrequest limit; the page polls until all are back.
const MAX_TASKS_PER_COLLECT = 25;
// DataForSEO keeps queued results for days, but a run still pending after
// this long has stalled; settle it so the grid can run again.
const STALE_RUN_MS = 30 * 60 * 1000;

type Grid = NonNullable<
  Awaited<ReturnType<typeof LocalGridRepository.getGrid>>
>;
type Run = NonNullable<Awaited<ReturnType<typeof LocalGridRepository.getRun>>>;

// Maps rows are untrusted vendor data; keep only what the grid stores.
const mapsItemSchema = z.looseObject({
  type: z.string().nullish(),
  rank_group: z.number().nullish(),
  title: z.string().nullish(),
  cid: z.string().nullish(),
  place_id: z.string().nullish(),
  rating: z
    .looseObject({
      value: z.number().nullish(),
      votes_count: z.number().nullish(),
    })
    .nullish(),
});

/** Organic Maps results in rank order; paid pins are not rankings. */
function parseMapsItems(items: unknown[]) {
  return items.flatMap((item) => {
    const parsed = mapsItemSchema.safeParse(item);
    if (!parsed.success || parsed.data.type !== "maps_search") return [];
    const row = parsed.data;
    if (row.rank_group == null) return [];
    return [
      {
        rank: row.rank_group,
        title: row.title ?? null,
        cid: row.cid ?? null,
        placeId: row.place_id ?? null,
        rating: row.rating?.value ?? null,
        reviewsCount: row.rating?.votes_count ?? null,
      },
    ];
  });
}

function isTarget(
  row: { title: string | null; cid: string | null; placeId: string | null },
  grid: Grid,
) {
  if (grid.businessPlaceId && row.placeId === grid.businessPlaceId) return true;
  if (grid.businessCid && row.cid === grid.businessCid) return true;
  // Name matching is the fallback for a business picked without an id.
  if (grid.businessPlaceId || grid.businessCid) return false;
  return (
    row.title != null &&
    row.title.toLowerCase().includes(grid.businessName.toLowerCase())
  );
}

async function createGrid(
  project: { id: string; languageCode: string },
  input: CreateLocalGridInput,
) {
  const id = crypto.randomUUID();
  await LocalGridRepository.createGrid({
    id,
    projectId: project.id,
    keyword: input.keyword.trim(),
    businessName: input.businessName.trim(),
    businessPlaceId: input.businessPlaceId ?? null,
    businessCid: input.businessCid ?? null,
    centerLatitude: input.centerLatitude,
    centerLongitude: input.centerLongitude,
    gridSize: input.gridSize,
    spacingKm: input.spacingKm,
    device: input.device,
    languageCode: input.languageCode ?? project.languageCode,
    createdAt: new Date().toISOString(),
  });
  return { id };
}

async function requireGrid(projectId: string, gridId: string) {
  const grid = await LocalGridRepository.getGrid(projectId, gridId);
  if (!grid) throw new AppError("NOT_FOUND", "Local grid not found");
  return grid;
}

async function startRun(input: {
  projectId: string;
  gridId: string;
  billingCustomer: BillingCustomerContext;
}) {
  const grid = await requireGrid(input.projectId, input.gridId);
  const points = buildRankGridPoints(
    { latitude: grid.centerLatitude, longitude: grid.centerLongitude },
    grid.gridSize,
    grid.spacingKm,
  );
  const zoom = rankGridZoom(grid.spacingKm, grid.centerLatitude);
  const runId = crypto.randomUUID();

  const created = await LocalGridRepository.tryCreateRun({
    id: runId,
    gridId: grid.id,
    projectId: input.projectId,
    gridSize: grid.gridSize,
    spacingKm: grid.spacingKm,
    zoom,
    startedAt: new Date().toISOString(),
  });
  if (!created) {
    // A second click while a run is in flight shows that run, not a new bill.
    const [latest] = await LocalGridRepository.listRuns(
      input.projectId,
      grid.id,
      1,
    );
    if (latest?.status === "pending") return { runId: latest.id };
    throw new AppError("CONFLICT");
  }

  let taskIds: Array<string | null>;
  try {
    // One metered post buys every point; collection is free.
    taskIds = await createDataforseoClient(
      input.billingCustomer,
    ).serp.localTaskPost({
      keyword: grid.keyword,
      locationCoordinates: points.map((point) =>
        formatLocalSerpCoordinate({ ...point, zoom }),
      ),
      languageCode: grid.languageCode,
      device: grid.device,
      depth: LOCAL_GRID_DEPTH,
    });
  } catch (error) {
    await LocalGridRepository.updateRun(runId, {
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Search failed",
      completedAt: new Date().toISOString(),
    });
    throw error;
  }

  await LocalGridRepository.insertPoints(
    points.map((point, index) => ({
      id: crypto.randomUUID(),
      runId,
      ...point,
      taskId: taskIds[index],
      // A point DataForSEO refused at post time has nothing to collect.
      status: taskIds[index] ? "pending" : "failed",
    })),
  );
  return { runId };
}

async function collectPoint(
  grid: Grid,
  point: { id: string; taskId: string | null },
) {
  if (!point.taskId) return;
  const outcome = await fetchLocalSerpTaskResult(point.taskId);
  if (outcome.status === "pending") return;
  if (outcome.status === "failed") {
    console.warn(
      `[local-grid] task ${point.taskId} failed: ${outcome.message}`,
    );
    await LocalGridRepository.settlePoint(point.id, {
      status: "failed",
      rank: null,
      resultsCount: null,
    });
    return;
  }

  const rows = parseMapsItems(outcome.items);
  const target = rows.find((row) => isTarget(row, grid));
  const settled = await LocalGridRepository.settlePoint(point.id, {
    status: "completed",
    rank: target?.rank ?? null,
    resultsCount: rows.length,
  });
  if (!settled) return;
  await LocalGridRepository.insertPointResults(
    rows.map((row) => ({
      pointId: point.id,
      ...row,
      isTarget: row === target,
    })),
  );
}

/**
 * Collects whatever pending searches have finished and completes the run once
 * none are left. Safe to call concurrently: each point settles once.
 */
async function collectRun(run: Run) {
  if (run.status !== "pending") return;
  const grid = await requireGrid(run.projectId, run.gridId);
  const points = await LocalGridRepository.getPointsForRuns([run.id]);
  const pending = points.filter((point) => point.status === "pending");

  const isStale = Date.now() - Date.parse(run.startedAt) > STALE_RUN_MS;
  if (isStale) {
    await LocalGridRepository.failPendingPoints(run.id);
  } else {
    // A failed fetch leaves the point pending for the next poll.
    const results = await Promise.allSettled(
      pending
        .slice(0, MAX_TASKS_PER_COLLECT)
        .map((point) => collectPoint(grid, point)),
    );
    for (const result of results) {
      if (result.status === "rejected") {
        console.warn("[local-grid] collect failed:", result.reason);
      }
    }
  }

  const after = await LocalGridRepository.getPointsForRuns([run.id]);
  if (after.some((point) => point.status === "pending")) return;
  const allFailed = after.every((point) => point.status === "failed");
  await LocalGridRepository.updateRun(run.id, {
    status: allFailed ? "failed" : "completed",
    errorMessage: allFailed
      ? isStale
        ? "The searches did not come back in time."
        : "Every grid search failed at DataForSEO."
      : null,
    completedAt: new Date().toISOString(),
  });
}

function summarizeRun(
  run: Run,
  points: Array<{ runId: string; status: string; rank: number | null }>,
) {
  const own = points.filter((point) => point.runId === run.id);
  return {
    id: run.id,
    status: run.status,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    gridSize: run.gridSize,
    spacingKm: run.spacingKm,
    errorMessage: run.errorMessage,
    pointsPending: own.filter((point) => point.status === "pending").length,
    ...summarizeLocalGridRanks(own),
  };
}

async function listGridsWithLatestRun(projectId: string) {
  const grids = await LocalGridRepository.listGrids(projectId);
  const latestRuns = await Promise.all(
    grids.map(async (grid) => {
      const [run] = await LocalGridRepository.listRuns(projectId, grid.id, 1);
      return run ?? null;
    }),
  );
  const points = await LocalGridRepository.getPointsForRuns(
    latestRuns.flatMap((run) => (run ? [run.id] : [])),
  );
  return grids.map((grid, index) => {
    const run = latestRuns[index];
    return { ...grid, latestRun: run ? summarizeRun(run, points) : null };
  });
}

async function getGridDetail(projectId: string, gridId: string) {
  const grid = await requireGrid(projectId, gridId);
  const runs = await LocalGridRepository.listRuns(projectId, gridId);
  const points = await LocalGridRepository.getPointsForRuns(
    runs.map((run) => run.id),
  );
  return { grid, runs: runs.map((run) => summarizeRun(run, points)) };
}

/** Collects a pending run first, so polling this is what finishes it. */
async function getRunDetail(projectId: string, runId: string) {
  const initial = await LocalGridRepository.getRun(projectId, runId);
  if (!initial) throw new AppError("NOT_FOUND", "Grid run not found");
  await collectRun(initial);
  const run = (await LocalGridRepository.getRun(projectId, runId)) ?? initial;

  // The previous completed run of the same shape, for per-point change.
  const history = await LocalGridRepository.listRuns(projectId, run.gridId);
  const previous = history.find(
    (candidate) =>
      candidate.startedAt < run.startedAt &&
      candidate.status === "completed" &&
      candidate.gridSize === run.gridSize &&
      candidate.spacingKm === run.spacingKm,
  );

  const points = await LocalGridRepository.getPointsForRuns(
    previous ? [run.id, previous.id] : [run.id],
  );
  const byCell = (forRunId: string) =>
    points
      .filter((point) => point.runId === forRunId)
      .sort((a, b) => a.row - b.row || a.col - b.col);

  return {
    run: summarizeRun(run, points),
    zoom: run.zoom,
    points: byCell(run.id).map((point) => ({
      id: point.id,
      row: point.row,
      col: point.col,
      latitude: point.latitude,
      longitude: point.longitude,
      status: point.status,
      rank: point.rank,
      resultsCount: point.resultsCount,
    })),
    previous: previous
      ? {
          ...summarizeRun(previous, points),
          ranks: byCell(previous.id).map((point) =>
            point.status === "completed" ? point.rank : null,
          ),
        }
      : null,
  };
}

async function getPointResults(
  projectId: string,
  runId: string,
  pointId: string,
) {
  const run = await LocalGridRepository.getRun(projectId, runId);
  if (!run) throw new AppError("NOT_FOUND", "Grid run not found");
  const point = await LocalGridRepository.getPoint(run.id, pointId);
  if (!point) throw new AppError("NOT_FOUND", "Grid point not found");
  return LocalGridRepository.getPointResults(point.id);
}

async function deleteGrid(projectId: string, gridId: string) {
  await LocalGridRepository.deleteGrid(projectId, gridId);
}

export const LocalGridService = {
  createGrid,
  startRun,
  listGridsWithLatestRun,
  getGridDetail,
  getRunDetail,
  getPointResults,
  deleteGrid,
};
