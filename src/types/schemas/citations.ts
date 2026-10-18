import { z } from "zod";

const projectId = z.string().uuid();

export const createCitationCheckSchema = z.object({
  projectId,
  businessName: z.string().trim().min(1).max(200),
  city: z.string().trim().min(1).max(100).optional(),
  // The market to search in; the project's own when left out.
  locationCode: z.number().int().positive().optional(),
});

export type CreateCitationCheckInput = z.infer<
  typeof createCitationCheckSchema
>;

export const citationProjectSchema = z.object({ projectId });

export const citationCheckSchema = z.object({
  projectId,
  checkId: z.string().uuid(),
});

export const citationRunSchema = z.object({
  projectId,
  runId: z.string().uuid(),
});
