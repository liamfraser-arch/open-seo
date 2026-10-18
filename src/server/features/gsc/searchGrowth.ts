import { sort } from "remeda";
import type { GscSearchAnalyticsRow } from "@/server/lib/gscClient";

export type WeeklyGrowthPoint = {
  /** The Monday of the week, as YYYY-MM-DD. */
  weekStart: string;
  clicks: number;
  impressions: number;
  /** Impression-weighted average position; 0 when there were no impressions. */
  position: number;
};

function mondayOf(date: string) {
  const day = new Date(`${date}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  return day.toISOString().slice(0, 10);
}

/**
 * Daily Search Console rows as one point per week. A single keyword gets only
 * a few clicks a day, so days are too noisy to show growth; weeks are not.
 */
export function toWeeklyGrowth(rows: GscSearchAnalyticsRow[]) {
  const weeks = new Map<
    string,
    { clicks: number; impressions: number; weightedPosition: number }
  >();
  for (const row of rows) {
    const date = row.keys?.[0];
    if (!date) continue;
    const key = mondayOf(date);
    const week = weeks.get(key) ?? {
      clicks: 0,
      impressions: 0,
      weightedPosition: 0,
    };
    week.clicks += row.clicks;
    week.impressions += row.impressions;
    week.weightedPosition += row.position * row.impressions;
    weeks.set(key, week);
  }
  return sort(
    [...weeks].map(([weekStart, week]) => ({
      weekStart,
      clicks: week.clicks,
      impressions: week.impressions,
      position:
        week.impressions > 0 ? week.weightedPosition / week.impressions : 0,
    })),
    (a, b) => a.weekStart.localeCompare(b.weekStart),
  );
}
