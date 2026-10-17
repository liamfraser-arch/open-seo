import type { PortalContent } from "@/shared/portal-content";
import type { PortalTraffic } from "@/shared/portal-traffic";

// Sample numbers for the staff-only preview (?demo=1), so a dashboard can be
// shown full of results. They are built in the browser and never saved.

const daysAgo = (days: number) =>
  new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);

const step = (
  month: number,
  title: string,
  status: "todo" | "doing" | "done",
  detail = "",
) => ({ month, title, detail, status });

const keyword = (
  name: string,
  monthlyVolume: number | null,
  startPosition: number | null,
  currentPosition: number | null,
) => ({ keyword: name, monthlyVolume, startPosition, currentPosition });

export const demoContent: PortalContent = {
  startDate: daysAgo(105),
  summary:
    "Get Cold Factor found first by homeowners in Flower Mound, Lewisville and Roanoke when their AC or heating breaks.",
  milestones: [
    step(1, "Record the starting point", "done"),
    step(1, "Tune up the Google Business Profile", "done"),
    step(1, "Fix the service-area pages", "done"),
    step(2, "Build city + service pages", "done"),
    step(2, "Link the guides to the service pages", "done"),
    step(3, "Start a review system", "done"),
    step(3, "Clean up business listings", "done"),
    step(4, "Turn the guides into lead pages", "doing"),
    step(4, "Add an emergency service page", "todo"),
    step(5, "Earn local links", "todo"),
    step(5, "Neighbourhood content", "todo"),
    step(6, "Re-run the Local Grid in each town", "todo"),
    step(6, "Review results and plan the next phase", "todo"),
  ],
  clusters: [
    {
      name: "AC repair & emergency service",
      keywords: [
        keyword("ac repair flower mound", 210, null, 7),
        keyword("ac repair lewisville tx", 590, null, 12),
        keyword("ac repair roanoke tx", 10, null, 4),
        keyword("hvac repair flower mound", 20, null, 9),
      ],
    },
    {
      name: "Other towns we serve",
      keywords: [
        keyword("ac repair frisco tx", 1000, 43, 8),
        keyword("ac repair frisco", 1000, 49, 11),
        keyword("colony ac", 880, 35, 6),
      ],
    },
    {
      name: "Heating & furnace",
      keywords: [
        keyword("types of heating", 1300, 40, 14),
        keyword("heating types", 1300, 48, 12),
        keyword("does a heat pump heat and cool", 720, 39, 9),
      ],
    },
    {
      name: "Ducts & air quality",
      keywords: [
        keyword("air vent cleaning cost", 1600, 43, 15),
        keyword("air duct cleaning flower mound", 140, null, 18),
      ],
    },
    {
      name: "AC troubleshooting guides",
      keywords: [
        keyword("ac unit not blowing cold air", 14800, 75, 31),
        keyword("ac not cold air", 1300, 64, 22),
      ],
    },
  ],
  wins: [
    {
      title: "Now in the Google Maps top 3 near the shop",
      detail: "Was outside the top 20 in this area at the start.",
      wonOn: daysAgo(12),
    },
    {
      title: "Passed three local competitors for AC repair in Roanoke",
      detail: "Now #4 for ac repair roanoke tx.",
      wonOn: daysAgo(31),
    },
    {
      title: "First 5-star review streak: 12 new reviews in a month",
      detail: "Review requests after every job started working.",
      wonOn: daysAgo(48),
    },
  ],
};

const monthKey = (monthsBack: number) => {
  const date = new Date();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() - monthsBack);
  return date.toISOString().slice(0, 7);
};

const clicks = [120, 148, 196, 262, 341, 428];
export const demoTraffic: PortalTraffic = {
  threeMonths: {
    clicks: clicks[3] + clicks[4] + clicks[5],
    impressions: 31_200,
    prevClicks: clicks[0] + clicks[1] + clicks[2],
    prevImpressions: 14_900,
  },
  yearOnYear: {
    clicks: clicks[3] + clicks[4] + clicks[5],
    impressions: 31_200,
    prevClicks: 388,
    prevImpressions: 9_400,
  },
  monthly: clicks.map((value, index) => ({
    month: monthKey(5 - index),
    clicks: value,
    impressions: value * 24,
  })),
};

const weeksAgo = (weeks: number) =>
  new Date(Date.now() - weeks * 7 * 86_400_000).toISOString();

const series = (keywordLabel: string, shares: number[]) => ({
  gridId: keywordLabel,
  keyword: keywordLabel,
  points: shares.map((top3Share, index) => ({
    date: weeksAgo((shares.length - 1 - index) * 4),
    top3Share,
    averageRank: Math.round((14 - top3Share / 6) * 10) / 10,
  })),
});

export const demoTrend = [
  series("HVAC contractor", [12, 16, 20, 28, 36, 44, 52]),
  series("AC repair", [8, 8, 12, 16, 24, 32, 40]),
];
