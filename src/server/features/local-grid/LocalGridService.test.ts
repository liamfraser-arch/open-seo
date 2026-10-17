import { beforeEach, describe, expect, it, vi } from "vitest";
import { LocalGridService } from "./LocalGridService";

const repo = vi.hoisted(() => ({
  getGrid: vi.fn(),
  getRun: vi.fn(),
  listRuns: vi.fn(),
  getPointsForRuns: vi.fn(),
  settlePoint: vi.fn(),
  failPendingPoints: vi.fn(),
  insertPointResults: vi.fn(),
  updateRun: vi.fn(),
}));
const fetchLocalSerpTaskResult = vi.hoisted(() => vi.fn());

vi.mock("./LocalGridRepository", () => ({ LocalGridRepository: repo }));
vi.mock("@/server/lib/dataforseo", () => ({
  createDataforseoClient: vi.fn(),
  fetchLocalSerpTaskResult,
}));

const grid = {
  id: "grid_1",
  projectId: "project_1",
  businessName: "Acme Plumbing",
  businessPlaceId: "place_acme",
  businessCid: null,
};
const run = {
  id: "run_1",
  gridId: "grid_1",
  projectId: "project_1",
  status: "pending",
  gridSize: 3,
  spacingKm: 1,
  zoom: 13,
  startedAt: new Date().toISOString(),
};
const pendingPoint = {
  id: "point_1",
  runId: "run_1",
  row: 0,
  col: 0,
  latitude: 1,
  longitude: 2,
  taskId: "task_1",
  status: "pending",
  rank: null,
};

beforeEach(() => {
  repo.getGrid.mockResolvedValue(grid);
  repo.getRun.mockResolvedValue(run);
  repo.listRuns.mockResolvedValue([run]);
  repo.settlePoint.mockResolvedValue(true);
  repo.getPointsForRuns
    .mockResolvedValueOnce([pendingPoint])
    .mockResolvedValue([{ ...pendingPoint, status: "completed", rank: 2 }]);
  fetchLocalSerpTaskResult.mockResolvedValue({
    status: "completed",
    items: [
      // A paid pin above the pack is not a ranking.
      { type: "maps_paid_item", rank_group: 1, title: "Ad Plumbing" },
      { type: "maps_search", rank_group: 1, title: "Rival", place_id: "x" },
      {
        type: "maps_search",
        rank_group: 2,
        // A title match alone must not win when the grid has a place id.
        title: "Acme Plumbing",
        place_id: "place_acme",
        rating: { value: 4.8, votes_count: 120 },
      },
    ],
  });
});

describe("LocalGridService.getRunDetail", () => {
  it("ranks the business by its organic position and completes the run", async () => {
    await LocalGridService.getRunDetail("project_1", "run_1");

    expect(repo.settlePoint).toHaveBeenCalledWith("point_1", {
      status: "completed",
      rank: 2,
      resultsCount: 2,
    });
    expect(repo.insertPointResults).toHaveBeenCalledWith([
      expect.objectContaining({ rank: 1, title: "Rival", isTarget: false }),
      expect.objectContaining({
        rank: 2,
        placeId: "place_acme",
        rating: 4.8,
        reviewsCount: 120,
        isTarget: true,
      }),
    ]);
    expect(repo.updateRun).toHaveBeenCalledWith(
      "run_1",
      expect.objectContaining({ status: "completed", errorMessage: null }),
    );
  });

  it("writes no results for a point another poll already settled", async () => {
    repo.settlePoint.mockResolvedValue(false);

    await LocalGridService.getRunDetail("project_1", "run_1");

    expect(repo.insertPointResults).not.toHaveBeenCalled();
  });
});
