import { describe, expect, it } from "vitest";
import {
  keywordMovers,
  positionGain,
  rankBucket,
  rankSummary,
  strategyProgress,
} from "./portal-content";

describe("strategyProgress", () => {
  const milestones = [
    { month: 1, title: "a", detail: "", status: "done" as const },
    { month: 2, title: "b", detail: "", status: "doing" as const },
    { month: 3, title: "c", detail: "", status: "todo" as const },
    { month: 3, title: "d", detail: "", status: "done" as const },
  ];

  it("counts finished steps and the calendar month", () => {
    expect(
      strategyProgress(
        { startDate: "2026-01-01", milestones },
        new Date("2026-03-10"),
      ),
    ).toMatchObject({ currentMonth: 3, milestonesDone: 2, percentDone: 50 });
  });

  it("stays within months 1 to 6, before and after the plan", () => {
    const at = (now: string) =>
      strategyProgress({ startDate: "2026-06-01", milestones }, new Date(now))
        .currentMonth;
    expect(at("2026-05-01")).toBe(1);
    expect(at("2027-06-01")).toBe(6);
  });
});

describe("positionGain", () => {
  it("is places gained, positive when the rank improves", () => {
    expect(positionGain(18, 6)).toBe(12);
    expect(positionGain(4, 9)).toBe(-5);
  });

  it("counts reaching the results from unranked as a gain", () => {
    expect(positionGain(null, 40)).toBe(61);
    expect(positionGain(null, null)).toBeNull();
  });
});

const keyword = (
  name: string,
  startPosition: number | null,
  currentPosition: number | null,
) => ({ keyword: name, monthlyVolume: null, startPosition, currentPosition });

it("picks the biggest climbers and ignores small moves, drops and unranked", () => {
  const movers = keywordMovers({
    clusters: [
      {
        name: "x",
        keywords: [
          keyword("big", 43, 8),
          keyword("medium", 30, 20),
          keyword("small", 12, 10),
          keyword("dropped", 5, 15),
          keyword("never", null, null),
        ],
      },
    ],
  });
  expect(movers.map((m) => m.keyword)).toEqual(["big", "medium"]);
});

describe("keywordMovers", () => {
  it("counts a keyword newly on page 1 or 2, but not one stuck deep", () => {
    const movers = keywordMovers({
      clusters: [
        {
          name: "x",
          keywords: [keyword("new", null, 9), keyword("deep", null, 70)],
        },
      ],
    });
    expect(movers.map((m) => m.keyword)).toEqual(["new"]);
  });
});

describe("rankSummary", () => {
  it("counts keywords per rank bucket at the start and now", () => {
    const summary = rankSummary({
      clusters: [
        {
          name: "x",
          keywords: [
            {
              keyword: "a",
              monthlyVolume: null,
              startPosition: 43,
              currentPosition: 8,
            },
            {
              keyword: "b",
              monthlyVolume: null,
              startPosition: null,
              currentPosition: 2,
            },
            {
              keyword: "c",
              monthlyVolume: null,
              startPosition: 9,
              currentPosition: 15,
            },
          ],
        },
      ],
    });
    expect(summary.start).toMatchObject({ page3to5: 1, none: 1, page1: 1 });
    expect(summary.now).toMatchObject({ page1: 1, top3: 1, page2: 1 });
    expect([summary.pageOneStart, summary.pageOneNow]).toEqual([1, 2]);
    expect(summary.improved).toBe(2);
    expect(summary.movement.map((m) => m.keyword)).toEqual(["b", "a", "c"]);
  });

  it("puts positions in the right bucket", () => {
    expect(
      [3, 4, 10, 11, 100, null].map((position) => rankBucket(position)),
    ).toEqual(["top3", "page1", "page1", "page2", "deep", "none"]);
  });
});
