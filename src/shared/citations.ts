import { applyBillingMarkupUsd, creditsForProviderUsd } from "./billing";
import { getIsoCountryCode } from "./keyword-locations";
import { costPerSerpAtDepth, serpKeywordCostMultiplier } from "./rank-tracking";

// A listing is a result on the directory's own domain, at a path that is a
// business page (not a search, category or review-feed page), that names the
// business. `countries` lists the markets a directory serves, as lowercase ISO
// codes, or "all".
export const CITATION_DIRECTORIES = [
  {
    key: "facebook",
    name: "Facebook",
    domain: "facebook.com",
    listing:
      /^\/(?!groups|fb-answers|watch|public|hashtag|events|marketplace|share|people|login)[^/]+\/?$|^\/pages\/|^\/p\//,
    countries: "all",
  },
  {
    key: "yelp",
    name: "Yelp",
    domain: "yelp.com",
    listing: /^\/biz\//,
    countries: ["us", "ca", "gb", "au"],
  },
  {
    key: "bbb",
    name: "Better Business Bureau",
    domain: "bbb.org",
    listing: /\/profile\//,
    countries: ["us", "ca"],
  },
  {
    key: "yellowpages",
    name: "Yellow Pages",
    domain: "yellowpages.com",
    listing: /\/(bpp|mip)\//,
    countries: ["us"],
  },
  {
    key: "mapquest",
    name: "MapQuest",
    domain: "mapquest.com",
    listing: /^\/us\/[^/]+\/[^/]+-\d+$/,
    countries: ["us"],
  },
  {
    key: "foursquare",
    name: "Foursquare",
    domain: "foursquare.com",
    listing: /^\/v\//,
    countries: ["us"],
  },
  {
    key: "manta",
    name: "Manta",
    domain: "manta.com",
    listing: /^\/c\//,
    countries: ["us"],
  },
  {
    key: "superpages",
    name: "Superpages",
    domain: "superpages.com",
    listing: /\/bp\//,
    countries: ["us"],
  },
  {
    key: "angi",
    name: "Angi",
    domain: "angi.com",
    listing: /^\/companylist\/.+\/[^/]+\.htm$/,
    countries: ["us"],
  },
  {
    key: "thumbtack",
    name: "Thumbtack",
    domain: "thumbtack.com",
    listing: /\/service\/\d+/,
    countries: ["us"],
  },
  {
    key: "nextdoor",
    name: "Nextdoor",
    domain: "nextdoor.com",
    listing: /^\/pages\//,
    countries: ["us"],
  },
  {
    key: "chamberofcommerce",
    name: "Chamber of Commerce",
    domain: "chamberofcommerce.com",
    listing: /^\/united-states\/.+\/\d+-/,
    countries: ["us"],
  },
  {
    key: "hotfrog",
    name: "Hotfrog",
    domain: "hotfrog.com",
    listing: /^\/company\//,
    countries: ["us"],
  },
  {
    key: "brownbook",
    name: "Brownbook",
    domain: "brownbook.net",
    listing: /^\/business\//,
    countries: ["us"],
  },
  {
    key: "merchantcircle",
    name: "MerchantCircle",
    domain: "merchantcircle.com",
    listing: /./,
    countries: ["us"],
  },
  {
    key: "alignable",
    name: "Alignable",
    domain: "alignable.com",
    listing: /^\/[^/]+$/,
    countries: ["us"],
  },
  {
    key: "brabys",
    name: "Brabys",
    domain: "brabys.com",
    listing: /^\/(?!za\/)/,
    countries: ["za"],
  },
  {
    key: "cylexza",
    name: "Cylex South Africa",
    domain: "cylex.net.za",
    listing: /^\/company\//,
    countries: ["za"],
  },
  {
    key: "findmy",
    name: "FindMy",
    domain: "findmy.co.za",
    listing: /^\/services\/business\//,
    countries: ["za"],
  },
  {
    key: "procompare",
    name: "ProCompare",
    domain: "procompare.co.za",
    listing: /^\/providers\//,
    countries: ["za"],
  },
  {
    key: "yebobusiness",
    name: "Yebo Business",
    domain: "yebobusiness.co.za",
    listing: /^\/business\//,
    countries: ["za"],
  },
  {
    key: "hotfrogza",
    name: "Hotfrog South Africa",
    domain: "hotfrog.co.za",
    listing: /^\/company\//,
    countries: ["za"],
  },
] as const;

export type CitationDirectory = (typeof CITATION_DIRECTORIES)[number];

/** The directories that serve a market, given its DataForSEO location code. */
export function directoriesForLocation(locationCode: number) {
  const country = getIsoCountryCode(locationCode);
  return CITATION_DIRECTORIES.filter(
    (directory) =>
      directory.countries === "all" ||
      (directory.countries as readonly string[]).includes(country),
  );
}

export const CITATION_SERP_DEPTH = 10;

/** The most a check can spend: a plain search, then a site: search, each. */
export function estimateCitationCheckCost(locationCode: number) {
  const perDirectory =
    costPerSerpAtDepth(CITATION_SERP_DEPTH, "live") *
    (1 + serpKeywordCostMultiplier("site:"));
  const rawUsd = directoriesForLocation(locationCode).length * perDirectory;
  return {
    rawUsd,
    billedUsd: applyBillingMarkupUsd(rawUsd),
    costCredits: creditsForProviderUsd(rawUsd),
  };
}

function words(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

const NAME_NOISE = new Set([
  "the",
  "and",
  "llc",
  "inc",
  "co",
  "corp",
  "corporation",
  "ltd",
  "company",
]);

function normalizeName(value: string) {
  return words(value)
    .filter((word) => !NAME_NOISE.has(word))
    .join(" ");
}

/** The name as plain words, for a search query ("&" and "LLC" removed). */
export function searchableName(value: string) {
  return normalizeName(value);
}

/** True when a search result's text names the business. */
export function mentionsBusiness(businessName: string, text: string) {
  const name = normalizeName(businessName);
  return name !== "" && normalizeName(text).includes(name);
}
