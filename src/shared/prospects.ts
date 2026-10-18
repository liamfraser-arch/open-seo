import { sort } from "remeda";
import { CITATION_DIRECTORIES } from "./citations";
import { applyBillingMarkupUsd, creditsForProviderUsd } from "./billing";

export const PROSPECT_STATUSES = ["new", "contacted", "won", "passed"] as const;
export type ProspectStatus = (typeof PROSPECT_STATUSES)[number];

/** Maps bills one request through depth 100, so a search is one flat charge. */
export const PROSPECT_SEARCH_DEPTH = 100;
const PROSPECT_SEARCH_USD = 0.002;

export function estimateProspectSearchCost() {
  return {
    rawUsd: PROSPECT_SEARCH_USD,
    billedUsd: applyBillingMarkupUsd(PROSPECT_SEARCH_USD),
    costCredits: creditsForProviderUsd(PROSPECT_SEARCH_USD),
  };
}

// A Maps "website" that is a directory or social page is not a site of their own.
const NOT_A_WEBSITE = [
  ...CITATION_DIRECTORIES.map((directory) => directory.domain),
  "instagram.com",
  "linkedin.com",
  "youtube.com",
  "wa.me",
  "linktr.ee",
];

/** True when the listing's website is the business's own, not a profile page. */
export function hasOwnWebsite(domain: string | null, url: string | null) {
  const host = domain?.toLowerCase().replace(/^www\./, "");
  if (!host) return Boolean(url);
  return !NOT_A_WEBSITE.some(
    (blocked) => host === blocked || host.endsWith(`.${blocked}`),
  );
}

export type ProspectSignals = {
  rank: number;
  reviewsCount: number | null;
  rating: number | null;
  photosCount: number | null;
  hasWebsite: boolean;
  isClaimed: boolean | null;
};

type Weakness = { points: number; reason: string };

/**
 * How much a business could use help with its Google presence, from what its
 * Maps listing shows. Each weakness adds points and a plain-language reason;
 * 100 is the most. Strong, busy businesses score low, and so do listings that
 * look abandoned (no website and almost no reviews): there is no one to sell to.
 */
export function scoreProspect(signals: ProspectSignals) {
  const weaknesses: Weakness[] = [];
  const add = (points: number, reason: string) =>
    weaknesses.push({ points, reason });

  const reviews = signals.reviewsCount ?? 0;
  const looksInactive = !signals.hasWebsite && reviews < 15;
  if (looksInactive) {
    return { score: 10, reasons: ["Listing looks inactive"] };
  }

  // Close behind the top is the easiest win; far down the list is a long job.
  if (signals.rank > 40) add(5, `Ranks #${signals.rank} on Google Maps`);
  else if (signals.rank > 20) add(12, `Ranks #${signals.rank} on Google Maps`);
  else if (signals.rank > 3) add(20, `Ranks #${signals.rank} on Google Maps`);

  if (reviews < 10) add(15, `Only ${reviews} reviews`);
  else if (reviews < 30) add(12, `Only ${reviews} reviews`);
  else if (reviews < 75) add(5, `${reviews} reviews`);

  if (signals.rating !== null) {
    if (signals.rating < 4) add(12, `Low rating (${signals.rating})`);
    else if (signals.rating < 4.5) add(5, `Rating ${signals.rating}`);
  }

  const photos = signals.photosCount ?? 0;
  if (photos < 5) add(10, "Almost no photos");
  else if (photos < 20) add(5, `Only ${photos} photos`);

  if (!signals.hasWebsite) add(15, "No website");
  if (signals.isClaimed === false) add(15, "Profile not claimed");

  const score = Math.min(
    100,
    weaknesses.reduce((sum, weakness) => sum + weakness.points, 0),
  );
  return {
    score,
    // The biggest problems first.
    reasons: sort(weaknesses, (a, b) => b.points - a.points).map(
      (weakness) => weakness.reason,
    ),
  };
}
