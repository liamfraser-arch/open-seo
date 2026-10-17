import { applyBillingMarkupUsd, creditsForProviderUsd } from "./billing";

// SERP Google Maps, queued at high priority. measured: task_post bills $0.0012
// per task at depth 20.
export const LOCAL_SERP_TASK_USD = 0.0012;

/** How many Maps results each grid point checks for the target. */
export const LOCAL_GRID_DEPTH = 20;

export const LOCAL_GRID_SIZES = [3, 5, 7, 9] as const;
export type LocalGridSize = (typeof LOCAL_GRID_SIZES)[number];

export const MIN_LOCAL_GRID_SPACING_KM = 0.25;
export const MAX_LOCAL_GRID_SPACING_KM = 10;

/** One task_post covers the whole grid, so it is one metered charge. */
export function estimateLocalGridCost(gridSize: number) {
  const rawUsd = gridSize * gridSize * LOCAL_SERP_TASK_USD;
  return {
    rawUsd,
    billedUsd: applyBillingMarkupUsd(rawUsd),
    costCredits: creditsForProviderUsd(rawUsd),
  };
}

// Degrees per kilometre. Longitude degrees shrink with latitude; the cosine is
// floored so a near-polar center can't blow the spacing up.
const KM_PER_DEGREE_LATITUDE = 110.574;
const KM_PER_DEGREE_LONGITUDE = 111.32;
const MIN_LONGITUDE_COSINE = 0.01;

// Without an explicit zoom DataForSEO infers one per coordinate, which yields
// "No Search Results" for some points and makes ranks incomparable across the
// grid. A fixed zoom fails the other way: a mobile viewport at zoom 14 spans
// only ~±1.5 km east-west at mid latitudes, so a business one 2-3 km grid step
// to the side falls outside the viewport and reads as "not ranked" (verified
// live: a rank-3 business vanished at zoom 14 and reappeared at zoom 12).
// Derive the zoom from the spacing instead: a world tile is 40075·cos(lat)/2^z
// km wide and a portrait viewport ~1.5 tiles, so the largest zoom whose
// viewport still spans ~1.25× the spacing is log2(24045·cos(lat)/spacing).
const RANK_GRID_ZOOM_NUMERATOR_KM = 24045;
const MIN_RANK_GRID_ZOOM = 4;
const MAX_RANK_GRID_ZOOM = 18;

function longitudeCosine(latitude: number) {
  return Math.max(
    Math.abs(Math.cos((latitude * Math.PI) / 180)),
    MIN_LONGITUDE_COSINE,
  );
}

export function rankGridZoom(spacingKm: number, latitude: number): number {
  const zoom = Math.floor(
    Math.log2(
      (RANK_GRID_ZOOM_NUMERATOR_KM * longitudeCosine(latitude)) / spacingKm,
    ),
  );
  return Math.min(MAX_RANK_GRID_ZOOM, Math.max(MIN_RANK_GRID_ZOOM, zoom));
}

export type GridPoint = {
  row: number;
  col: number;
  latitude: number;
  longitude: number;
};

/** Row-major points, row 0 on the northern edge and col 0 on the western. */
export function buildRankGridPoints(
  center: { latitude: number; longitude: number },
  gridSize: number,
  spacingKm: number,
): GridPoint[] {
  const middle = (gridSize - 1) / 2;
  const latitudeStep = spacingKm / KM_PER_DEGREE_LATITUDE;
  const longitudeStep =
    spacingKm / (KM_PER_DEGREE_LONGITUDE * longitudeCosine(center.latitude));

  const points: GridPoint[] = [];
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      points.push({
        row,
        col,
        latitude: Number(
          (center.latitude + (middle - row) * latitudeStep).toFixed(7),
        ),
        longitude: Number(
          (center.longitude + (col - middle) * longitudeStep).toFixed(7),
        ),
      });
    }
  }
  return points;
}

/** Rank buckets shared by the map pins, the grid fallback and the legend. */
export function localGridRankBand(
  rank: number | null,
): "top3" | "top10" | "low" | "none" {
  if (rank == null) return "none";
  if (rank <= 3) return "top3";
  if (rank <= 10) return "top10";
  return "low";
}

/**
 * Run-level numbers. Share of local voice is the share of searched points
 * where the business is in the top 3, the Maps pack most searchers see.
 */
export function summarizeLocalGridRanks(
  points: Array<{ status: string; rank: number | null }>,
) {
  const searched = points.filter((point) => point.status === "completed");
  const ranks = searched.flatMap((point) =>
    point.rank == null ? [] : [point.rank],
  );
  const top3Count = ranks.filter((rank) => rank <= 3).length;
  return {
    pointsTotal: points.length,
    pointsSearched: searched.length,
    pointsFound: ranks.length,
    averageRank: ranks.length
      ? Number(
          (ranks.reduce((sum, rank) => sum + rank, 0) / ranks.length).toFixed(
            1,
          ),
        )
      : null,
    top3Count,
    top10Count: ranks.filter((rank) => rank <= 10).length,
    shareOfLocalVoice: searched.length
      ? Math.round((top3Count / searched.length) * 100)
      : null,
  };
}
