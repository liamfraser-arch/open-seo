import { and, desc, eq, inArray } from "drizzle-orm";
import type { InferInsertModel } from "drizzle-orm";
import { db } from "@/db";
import { executeInBatches } from "@/db/runBatch";
import {
  localGridPointResults,
  localGridPoints,
  localGridRuns,
  localGrids,
} from "@/db/schema";

const RUN_HISTORY_LIMIT = 50;

async function listGrids(projectId: string) {
  return db
    .select()
    .from(localGrids)
    .where(eq(localGrids.projectId, projectId))
    .orderBy(desc(localGrids.createdAt));
}

async function getGrid(projectId: string, gridId: string) {
  const rows = await db
    .select()
    .from(localGrids)
    .where(and(eq(localGrids.id, gridId), eq(localGrids.projectId, projectId)))
    .limit(1);
  return rows[0] ?? null;
}

async function createGrid(data: InferInsertModel<typeof localGrids>) {
  await db.insert(localGrids).values(data);
}

async function deleteGrid(projectId: string, gridId: string) {
  await db
    .delete(localGrids)
    .where(and(eq(localGrids.id, gridId), eq(localGrids.projectId, projectId)));
}

/** Newest first. */
async function listRuns(projectId: string, gridId: string, limit?: number) {
  return db
    .select()
    .from(localGridRuns)
    .where(
      and(
        eq(localGridRuns.projectId, projectId),
        eq(localGridRuns.gridId, gridId),
      ),
    )
    .orderBy(desc(localGridRuns.startedAt))
    .limit(limit ?? RUN_HISTORY_LIMIT);
}

async function getRun(projectId: string, runId: string) {
  const rows = await db
    .select()
    .from(localGridRuns)
    .where(
      and(eq(localGridRuns.id, runId), eq(localGridRuns.projectId, projectId)),
    )
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Inserts a pending run, or returns false when the grid already has one: the
 * partial unique index on pending runs rejects the second insert.
 */
async function tryCreateRun(data: InferInsertModel<typeof localGridRuns>) {
  const inserted = await db
    .insert(localGridRuns)
    .values({ ...data, status: "pending" })
    .onConflictDoNothing()
    .returning({ id: localGridRuns.id });
  return Boolean(inserted[0]);
}

async function updateRun(
  runId: string,
  data: Partial<InferInsertModel<typeof localGridRuns>>,
) {
  await db.update(localGridRuns).set(data).where(eq(localGridRuns.id, runId));
}

async function insertPoints(
  points: InferInsertModel<typeof localGridPoints>[],
) {
  await executeInBatches(points, (tx, point) =>
    tx.insert(localGridPoints).values(point),
  );
}

async function getPointsForRuns(runIds: string[]) {
  if (runIds.length === 0) return [];
  return db
    .select()
    .from(localGridPoints)
    .where(inArray(localGridPoints.runId, runIds));
}

async function getPoint(runId: string, pointId: string) {
  const rows = await db
    .select()
    .from(localGridPoints)
    .where(
      and(eq(localGridPoints.id, pointId), eq(localGridPoints.runId, runId)),
    )
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Settles a pending point. Returns false when another poll settled it first,
 * so only one caller writes its results.
 */
async function settlePoint(
  pointId: string,
  data: Pick<
    InferInsertModel<typeof localGridPoints>,
    "status" | "rank" | "resultsCount"
  >,
) {
  const updated = await db
    .update(localGridPoints)
    .set(data)
    .where(
      and(
        eq(localGridPoints.id, pointId),
        eq(localGridPoints.status, "pending"),
      ),
    )
    .returning({ id: localGridPoints.id });
  return Boolean(updated[0]);
}

async function failPendingPoints(runId: string) {
  await db
    .update(localGridPoints)
    .set({ status: "failed" })
    .where(
      and(
        eq(localGridPoints.runId, runId),
        eq(localGridPoints.status, "pending"),
      ),
    );
}

async function insertPointResults(
  results: InferInsertModel<typeof localGridPointResults>[],
) {
  await executeInBatches(results, (tx, result) =>
    tx.insert(localGridPointResults).values(result).onConflictDoNothing(),
  );
}

async function getPointResults(pointId: string) {
  return db
    .select()
    .from(localGridPointResults)
    .where(eq(localGridPointResults.pointId, pointId))
    .orderBy(localGridPointResults.rank);
}

export const LocalGridRepository = {
  listGrids,
  getGrid,
  createGrid,
  deleteGrid,
  listRuns,
  getRun,
  tryCreateRun,
  updateRun,
  insertPoints,
  getPointsForRuns,
  getPoint,
  settlePoint,
  failPendingPoints,
  insertPointResults,
  getPointResults,
};
