import { beforeEach, describe, expect, it, vi } from "vitest";
import { RankTrackingKeywordService } from "./RankTrackingKeywordService";

const repo = vi.hoisted(() => ({
  getConfigById: vi.fn(),
  getKeywordsForConfig: vi.fn(),
  getLatestSerp: vi.fn(),
}));
const listGrids = vi.hoisted(() => vi.fn());

vi.mock(
  "@/server/features/rank-tracking/repositories/RankTrackingRepository",
  () => ({ RankTrackingRepository: repo }),
);
vi.mock("@/server/features/local-grid/LocalGridRepository", () => ({
  LocalGridRepository: { listGrids },
}));

beforeEach(() => {
  repo.getConfigById.mockResolvedValue({ id: "config_1" });
  repo.getKeywordsForConfig.mockResolvedValue([{ keyword: "ac repair" }]);
});

describe("RankTrackingKeywordService.suggestLocalGridKeywords", () => {
  it("suggests grid keywords that are not tracked yet, once each", async () => {
    listGrids.mockResolvedValue([
      { keyword: "AC Repair", businessName: "Cold Factor" },
      { keyword: "Furnace Repair", businessName: "Cold Factor" },
      { keyword: "furnace repair", businessName: "Cold Factor Roanoke" },
    ]);
    expect(
      await RankTrackingKeywordService.suggestLocalGridKeywords(
        "config_1",
        "project_1",
      ),
    ).toEqual([{ keyword: "furnace repair", businessName: "Cold Factor" }]);
  });
});

describe("RankTrackingKeywordService.getKeywordSerp", () => {
  it("refuses a keyword that is not tracked in the config", async () => {
    await expect(
      RankTrackingKeywordService.getKeywordSerp(
        "config_1",
        "project_1",
        "other_keyword",
        "desktop",
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(repo.getLatestSerp).not.toHaveBeenCalled();
  });
});
