import type { BillingCustomerContext } from "@/server/billing/subscription";
import type { CitationRepository } from "@/server/features/citations/CitationRepository";
import { LocalGridRepository } from "@/server/features/local-grid/LocalGridRepository";
import { createDataforseoClient } from "@/server/lib/dataforseo";
import type { Nap } from "@/shared/nap";

type Check = NonNullable<
  Awaited<ReturnType<typeof CitationRepository.getCheck>>
>;

function stringField(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * The name, address and phone on the business's Google Business Profile. A
 * business already set up in a Local Grid is looked up by its saved place id,
 * which is exact; otherwise by name and city. Null when Google has no profile.
 */
export async function lookupReferenceNap(
  project: { id: string; languageCode: string },
  input: { businessName: string; city: string | null; locationCode: number },
  billingCustomer: BillingCustomerContext,
): Promise<Nap | null> {
  const grids = await LocalGridRepository.listGrids(project.id);
  const grid = grids.find(
    (candidate) => candidate.businessName === input.businessName,
  );
  const keyword = grid?.businessCid
    ? `cid:${grid.businessCid}`
    : grid?.businessPlaceId
      ? `place_id:${grid.businessPlaceId}`
      : [input.businessName, input.city].filter(Boolean).join(" ");
  try {
    const profile = await createDataforseoClient(
      billingCustomer,
    ).business.myBusinessInfo({
      keyword,
      locationCode: input.locationCode,
      languageCode: project.languageCode,
    });
    if (!profile) return null;
    return {
      name: stringField(profile.title),
      address: stringField(profile.address),
      phone: stringField(profile.phone),
    };
  } catch (error) {
    // The check still works without a reference; it just can't compare.
    console.warn("[citations] business profile lookup failed:", error);
    return null;
  }
}

export function referenceOf(check: Check): Nap {
  return {
    name: check.referenceName,
    address: check.referenceAddress,
    phone: check.referencePhone,
  };
}

export function hasReference(check: Check) {
  const reference = referenceOf(check);
  return Boolean(reference.name || reference.address || reference.phone);
}
