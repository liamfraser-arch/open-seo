import { z } from "zod";
import type { BillingCustomerContext } from "@/server/billing/subscription";
import { ProspectRepository } from "@/server/features/prospects/ProspectRepository";
import { createDataforseoClient } from "@/server/lib/dataforseo";
import { AppError } from "@/server/lib/errors";
import {
  hasOwnWebsite,
  PROSPECT_SEARCH_DEPTH,
  scoreProspect,
  type ProspectStatus,
} from "@/shared/prospects";
import { LOCATION_OPTIONS } from "@/shared/keyword-locations";
import type { CreateProspectSearchInput } from "@/types/schemas/prospects";

// Maps rows are untrusted vendor data; keep only what a prospect needs.
const mapsItemSchema = z.looseObject({
  type: z.string().nullish(),
  rank_group: z.number().nullish(),
  title: z.string().nullish(),
  place_id: z.string().nullish(),
  cid: z.string().nullish(),
  url: z.string().nullish(),
  domain: z.string().nullish(),
  phone: z.string().nullish(),
  address: z.string().nullish(),
  address_info: z.looseObject({ city: z.string().nullish() }).nullish(),
  category: z.string().nullish(),
  rating: z
    .looseObject({
      value: z.number().nullish(),
      votes_count: z.number().nullish(),
    })
    .nullish(),
  total_photos: z.number().nullish(),
  is_claimed: z.boolean().nullish(),
});

/** Organic Maps results, scored; paid pins are not businesses to approach. */
function toProspects(items: unknown[]) {
  const seen = new Set<string>();
  return items.flatMap((item) => {
    const parsed = mapsItemSchema.safeParse(item);
    if (!parsed.success || parsed.data.type !== "maps_search") return [];
    const row = parsed.data;
    if (row.rank_group == null || !row.title) return [];
    const identity = row.place_id ?? row.cid ?? row.title;
    if (seen.has(identity)) return [];
    seen.add(identity);

    const { score } = scoreProspect({
      rank: row.rank_group,
      reviewsCount: row.rating?.votes_count ?? null,
      rating: row.rating?.value ?? null,
      photosCount: row.total_photos ?? null,
      hasWebsite: hasOwnWebsite(row.domain ?? null, row.url ?? null),
      isClaimed: row.is_claimed ?? null,
    });
    return [
      {
        rank: row.rank_group,
        title: row.title,
        placeId: row.place_id ?? null,
        cid: row.cid ?? null,
        url: row.url ?? null,
        domain: row.domain ?? null,
        phone: row.phone ?? null,
        address: row.address ?? null,
        city: row.address_info?.city ?? null,
        category: row.category ?? null,
        rating: row.rating?.value ?? null,
        reviewsCount: row.rating?.votes_count ?? null,
        photosCount: row.total_photos ?? null,
        isClaimed: row.is_claimed ?? null,
        score,
      },
    ];
  });
}

async function createSearch(
  organizationId: string,
  input: CreateProspectSearchInput,
  billingCustomer: BillingCustomerContext,
) {
  const languageCode =
    LOCATION_OPTIONS.find((option) => option.code === input.locationCode)
      ?.languageCode ?? "en";
  const items = await createDataforseoClient(billingCustomer).serp.local({
    keyword: input.keyword,
    locationName: input.locationName,
    languageCode,
    searchType: "maps",
    device: "mobile",
    depth: PROSPECT_SEARCH_DEPTH,
  });
  const found = toProspects(items);
  if (found.length === 0) {
    throw new AppError(
      "NOT_FOUND",
      "Google Maps returned no businesses for that search.",
    );
  }

  const id = crypto.randomUUID();
  await ProspectRepository.createSearch(
    {
      id,
      organizationId,
      keyword: input.keyword,
      locationName: input.locationName,
      locationCode: input.locationCode,
      languageCode,
      createdAt: new Date().toISOString(),
    },
    found.map((row) => ({
      id: crypto.randomUUID(),
      searchId: id,
      organizationId,
      ...row,
    })),
  );
  return { id };
}

async function listSearches(organizationId: string) {
  const [searches, all] = await Promise.all([
    ProspectRepository.listSearches(organizationId),
    ProspectRepository.listProspectsForProject(organizationId),
  ]);
  return searches.map((search) => {
    const own = all.filter((row) => row.searchId === search.id);
    return {
      ...search,
      total: own.length,
      strong: own.filter((row) => row.score >= 50).length,
      contacted: own.filter((row) => row.status !== "new").length,
      won: own.filter((row) => row.status === "won").length,
    };
  });
}

async function getSearchDetail(organizationId: string, searchId: string) {
  const search = await ProspectRepository.getSearch(organizationId, searchId);
  if (!search) throw new AppError("NOT_FOUND", "Prospect search not found");
  const rows = await ProspectRepository.listProspects(organizationId, searchId);
  return {
    search,
    prospects: rows.map((row) => ({
      ...row,
      reasons: scoreProspect({
        rank: row.rank,
        reviewsCount: row.reviewsCount,
        rating: row.rating,
        photosCount: row.photosCount,
        hasWebsite: hasOwnWebsite(row.domain, row.url),
        isClaimed: row.isClaimed,
      }).reasons,
    })),
  };
}

async function setStatus(
  organizationId: string,
  prospectId: string,
  status: ProspectStatus,
) {
  const prospect = await ProspectRepository.getProspect(
    organizationId,
    prospectId,
  );
  if (!prospect) throw new AppError("NOT_FOUND", "Prospect not found");
  await ProspectRepository.setStatus(organizationId, prospectId, status);
}

async function deleteSearch(organizationId: string, searchId: string) {
  await ProspectRepository.deleteSearch(organizationId, searchId);
}

export const ProspectService = {
  createSearch,
  listSearches,
  getSearchDetail,
  setStatus,
  deleteSearch,
};
