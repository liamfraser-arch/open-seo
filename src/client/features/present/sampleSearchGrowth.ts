import { sort } from "remeda";
import type { WeeklyGrowthPoint } from "@/server/features/gsc/searchGrowth";

// Made-up Search Console numbers for rehearsing a meeting before a client has
// Search Console connected. Shown only on request (?demo=1) and always marked
// as a sample; nothing here is saved or sent anywhere.
const SAMPLE_QUERIES = [
  "hvac flower mound",
  "ac repair frisco tx",
  "heating and air lewisville",
  "furnace repair coppell",
  "ac installation flower mound",
  "emergency ac repair near me",
  "duct cleaning lewisville tx",
  "heat pump installation denton",
];
const WEEKS = 26;

function hashOf(text: string) {
  let hash = 2166136261;
  for (const char of text) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  }
  return hash >>> 0;
}

/** A small seeded random generator, so a query always draws the same line. */
function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mondayWeeksAgo(weeksAgo: number) {
  const day = new Date();
  day.setUTCHours(0, 0, 0, 0);
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7) - weeksAgo * 7);
  return day.toISOString().slice(0, 10);
}

/** Twenty-six weeks of steady growth with a little week-to-week noise. */
export function sampleWeeks(query: string): WeeklyGrowthPoint[] {
  const seed = hashOf(query);
  const random = seeded(seed);
  const startClicks = 1 + (seed % 4);
  const endClicks = 22 + (seed % 45);
  const impressionsPerClick = 14 + (seed % 12);
  const startPosition = 22 + (seed % 9);
  const endPosition = 4 + (seed % 5);

  return Array.from({ length: WEEKS }, (_, index) => {
    const progress = index / (WEEKS - 1);
    const eased = progress ** 1.3;
    const noise = 0.85 + random() * 0.3;
    const clicks = Math.max(
      0,
      Math.round((startClicks + (endClicks - startClicks) * eased) * noise),
    );
    return {
      weekStart: mondayWeeksAgo(WEEKS - 1 - index),
      clicks,
      impressions: Math.round(
        clicks * impressionsPerClick * (0.9 + random() * 0.2),
      ),
      position:
        Math.round(
          (startPosition +
            (endPosition - startPosition) * eased +
            (random() - 0.5) * 1.6) *
            10,
        ) / 10,
    };
  });
}

/** The sample queries as the "top searches" table, ordered by recent clicks. */
export function sampleQueryRows() {
  const rows = SAMPLE_QUERIES.map((key) => {
    const weeks = sampleWeeks(key).slice(-13);
    const clicks = weeks.reduce((sum, week) => sum + week.clicks, 0);
    const impressions = weeks.reduce((sum, week) => sum + week.impressions, 0);
    return {
      key,
      clicks,
      impressions,
      ctr: impressions > 0 ? clicks / impressions : 0,
      position: weeks.at(-1)?.position ?? 0,
    };
  });
  return sort(rows, (a, b) => b.clicks - a.clicks);
}
