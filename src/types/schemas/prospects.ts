import { z } from "zod";
import { PROSPECT_STATUSES } from "@/shared/prospects";

export const createProspectSearchSchema = z.object({
  // The trade, as a customer would search it: "hvac contractor".
  keyword: z.string().trim().min(1).max(120),
  // The country, as a DataForSEO location code.
  locationCode: z.number().int().positive(),
  // A canonical DataForSEO location name, from the location search.
  locationName: z.string().trim().min(1).max(200),
});

export type CreateProspectSearchInput = z.infer<
  typeof createProspectSearchSchema
>;

export const prospectSearchSchema = z.object({
  searchId: z.string().uuid(),
});

export const setProspectStatusSchema = z.object({
  prospectId: z.string().uuid(),
  status: z.enum(PROSPECT_STATUSES),
});
