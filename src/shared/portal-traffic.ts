import { sortBy } from "remeda";

export type TrafficDay = { date: string; clicks: number; impressions: number };

export type TrafficPeriod = {
  clicks: number;
  impressions: number;
  prevClicks: number;
  prevImpressions: number;
};

export type PortalTraffic = {
  /** Last 3 months against the 3 months before. */
  threeMonths: TrafficPeriod;
  /** The same 3 months a year earlier; null when Search Console has no data. */
  yearOnYear: TrafficPeriod | null;
  /** Calendar months, oldest first, for the last 6 months. */
  monthly: Array<{ month: string; clicks: number; impressions: number }>;
};

const WINDOW_DAYS = 91;
const MS_PER_DAY = 86_400_000;
export const YEAR_SHIFT_DAYS = 364;

const toMs = (date: string) => Date.parse(`${date}T00:00:00Z`);
export const shiftDate = (date: string, days: number) =>
  new Date(toMs(date) + days * MS_PER_DAY).toISOString().slice(0, 10);

function sumBetween(days: TrafficDay[], from: string, to: string) {
  let clicks = 0;
  let impressions = 0;
  for (const day of days) {
    if (day.date >= from && day.date <= to) {
      clicks += day.clicks;
      impressions += day.impressions;
    }
  }
  return { clicks, impressions };
}

/** The date range of the 3-month window that ends on `endDate`. */
export function trafficWindow(endDate: string) {
  return { startDate: shiftDate(endDate, -(WINDOW_DAYS - 1)), endDate };
}

/**
 * Turns Search Console daily rows into the comparisons a client reads.
 * `days` covers at least the 6 months before `endDate`; `yearAgoDays` covers
 * the same 3-month window 364 days earlier (weekdays line up).
 */
export function summarizeTraffic(input: {
  days: TrafficDay[];
  yearAgoDays: TrafficDay[];
  endDate: string;
}): PortalTraffic {
  const { days, yearAgoDays, endDate } = input;
  const current = trafficWindow(endDate);
  const previous = trafficWindow(shiftDate(current.startDate, -1));
  const now = sumBetween(days, current.startDate, current.endDate);
  const before = sumBetween(days, previous.startDate, previous.endDate);

  const yearWindow = trafficWindow(shiftDate(endDate, -YEAR_SHIFT_DAYS));
  const lastYear = sumBetween(
    yearAgoDays,
    yearWindow.startDate,
    yearWindow.endDate,
  );

  const byMonth = new Map<string, { clicks: number; impressions: number }>();
  const sixMonthsStart = shiftDate(endDate, -(2 * WINDOW_DAYS - 1));
  for (const day of days) {
    if (day.date < sixMonthsStart || day.date > endDate) continue;
    const month = day.date.slice(0, 7);
    const entry = byMonth.get(month) ?? { clicks: 0, impressions: 0 };
    entry.clicks += day.clicks;
    entry.impressions += day.impressions;
    byMonth.set(month, entry);
  }

  return {
    threeMonths: {
      ...now,
      prevClicks: before.clicks,
      prevImpressions: before.impressions,
    },
    yearOnYear:
      lastYear.impressions > 0 || lastYear.clicks > 0
        ? {
            ...now,
            prevClicks: lastYear.clicks,
            prevImpressions: lastYear.impressions,
          }
        : null,
    monthly: sortBy([...byMonth.entries()], ([month]) => month).map(
      ([month, totals]) => ({ month, ...totals }),
    ),
  };
}

/** Percent change, or null when there is nothing to compare against. */
export function percentChange(current: number, previous: number) {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}
