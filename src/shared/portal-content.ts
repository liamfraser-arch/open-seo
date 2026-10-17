import { sortBy } from "remeda";

export const PORTAL_STRATEGY_MONTHS = 6;

export const MILESTONE_STATUSES = ["todo", "doing", "done"] as const;
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

export type PortalContent = {
  startDate: string;
  summary: string;
  milestones: Array<{
    month: number;
    title: string;
    detail: string;
    status: MilestoneStatus;
  }>;
  clusters: Array<{
    name: string;
    keywords: Array<{
      keyword: string;
      monthlyVolume: number | null;
      startPosition: number | null;
      currentPosition: number | null;
    }>;
  }>;
  wins: Array<{ title: string; detail: string; wonOn: string }>;
};

const MS_PER_DAY = 86_400_000;

/** How far through the plan the project is: calendar month and finished work. */
export function strategyProgress(
  content: Pick<PortalContent, "startDate" | "milestones">,
  now = new Date(),
) {
  const elapsedDays = Math.max(
    0,
    (now.getTime() - Date.parse(content.startDate)) / MS_PER_DAY,
  );
  const currentMonth = Math.min(
    PORTAL_STRATEGY_MONTHS,
    Math.floor(elapsedDays / 30.4) + 1,
  );
  const total = content.milestones.length;
  const done = content.milestones.filter((m) => m.status === "done").length;
  return {
    currentMonth,
    monthsTotal: PORTAL_STRATEGY_MONTHS,
    milestonesDone: done,
    milestonesTotal: total,
    percentDone: total ? Math.round((done / total) * 100) : 0,
  };
}

/**
 * Places gained since the start (positive is better). Not ranking counts as
 * below the 100 Google shows, so first reaching the results is a gain.
 */
export function positionGain(
  start: number | null,
  current: number | null,
): number | null {
  if (start == null && current == null) return null;
  return (start ?? 101) - (current ?? 101);
}

const MIN_MOVER_GAIN = 5;
const MAX_CLIMBERS = 3;
const MAX_NEWCOMERS = 2;
// A keyword that was not ranking counts as a win once it reaches page 2.
const NEW_RANKING_MAX_POSITION = 20;

/**
 * The keywords that moved up the most since the plan started: the biggest
 * climbers first, then the best keywords that were not ranking before.
 */
export function keywordMovers(content: Pick<PortalContent, "clusters">) {
  const keywords = content.clusters.flatMap((cluster) => cluster.keywords);
  const climbers = keywords.flatMap(
    ({ keyword, startPosition: from, currentPosition: to }) => {
      const gain = positionGain(from, to);
      return from != null &&
        to != null &&
        gain != null &&
        gain >= MIN_MOVER_GAIN
        ? [{ keyword, from, to, gain }]
        : [];
    },
  );
  const newcomers = keywords.flatMap(
    ({ keyword, startPosition: from, currentPosition: to }) =>
      from == null && to != null && to <= NEW_RANKING_MAX_POSITION
        ? [{ keyword, from, to, gain: positionGain(from, to) ?? 0 }]
        : [],
  );
  return [
    ...sortBy(climbers, [(mover) => mover.gain, "desc"]).slice(0, MAX_CLIMBERS),
    ...sortBy(newcomers, (mover) => mover.to).slice(0, MAX_NEWCOMERS),
  ];
}

export const RANK_BUCKETS = [
  { key: "top3", label: "Top 3", max: 3 },
  { key: "page1", label: "4–10", max: 10 },
  { key: "page2", label: "11–20", max: 20 },
  { key: "page3to5", label: "21–50", max: 50 },
  { key: "deep", label: "51–100", max: 100 },
] as const;
export type RankBucketKey = (typeof RANK_BUCKETS)[number]["key"] | "none";

export function rankBucket(position: number | null): RankBucketKey {
  if (position == null) return "none";
  return RANK_BUCKETS.find((bucket) => position <= bucket.max)?.key ?? "none";
}

const emptyBuckets = (): Record<RankBucketKey, number> => ({
  top3: 0,
  page1: 0,
  page2: 0,
  page3to5: 0,
  deep: 0,
  none: 0,
});

const PAGE_ONE_MAX = 10;
const MAX_MOVEMENT_ROWS = 8;

/** Where all the tracked keywords stood at the start and where they stand now. */
export function rankSummary(content: Pick<PortalContent, "clusters">) {
  const keywords = content.clusters.flatMap((cluster) => cluster.keywords);
  const start = emptyBuckets();
  const now = emptyBuckets();
  for (const keyword of keywords) {
    start[rankBucket(keyword.startPosition)] += 1;
    now[rankBucket(keyword.currentPosition)] += 1;
  }
  const onPageOne = (position: number | null) =>
    position != null && position <= PAGE_ONE_MAX;
  const movement = keywords.flatMap(
    ({ keyword, startPosition: from, currentPosition: to }) => {
      const gain = positionGain(from, to);
      return to != null && gain != null && gain !== 0
        ? [{ keyword, from, to, gain }]
        : [];
    },
  );
  return {
    total: keywords.length,
    start,
    now,
    pageOneStart: keywords.filter((k) => onPageOne(k.startPosition)).length,
    pageOneNow: keywords.filter((k) => onPageOne(k.currentPosition)).length,
    improved: movement.filter((mover) => mover.gain > 0).length,
    /** Biggest movers first: gains, then any drops. */
    movement: sortBy(movement, [(mover) => mover.gain, "desc"]).slice(
      0,
      MAX_MOVEMENT_ROWS,
    ),
  };
}
