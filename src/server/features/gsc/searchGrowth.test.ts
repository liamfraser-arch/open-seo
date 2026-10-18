import { describe, expect, it } from "vitest";
import { toWeeklyGrowth } from "./searchGrowth";

const day = (
  date: string,
  clicks: number,
  impressions: number,
  position: number,
) => ({
  keys: [date],
  clicks,
  impressions,
  ctr: 0,
  position,
});

describe("toWeeklyGrowth", () => {
  it("groups days into Monday weeks and weights position by impressions", () => {
    const weeks = toWeeklyGrowth([
      // Sunday the 4th belongs to the week of Monday the 28th.
      day("2026-10-04", 1, 10, 20),
      day("2026-10-05", 2, 30, 10),
      day("2026-10-06", 3, 10, 30),
    ]);
    expect(weeks).toEqual([
      { weekStart: "2026-09-28", clicks: 1, impressions: 10, position: 20 },
      { weekStart: "2026-10-05", clicks: 5, impressions: 40, position: 15 },
    ]);
  });
});
