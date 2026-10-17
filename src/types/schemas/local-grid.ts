import { z } from "zod";
import { isSupportedLanguageCode } from "@/shared/keyword-locations";
import {
  LOCAL_GRID_SIZES,
  MAX_LOCAL_GRID_SPACING_KM,
  MIN_LOCAL_GRID_SPACING_KM,
} from "@/shared/local-grid";

const projectId = z.string().uuid();

export const createLocalGridSchema = z.object({
  projectId,
  keyword: z.string().trim().min(1).max(120),
  businessName: z.string().trim().min(1).max(200),
  businessPlaceId: z.string().min(1).max(256).optional(),
  businessCid: z.string().min(1).max(64).optional(),
  centerLatitude: z.number().min(-90).max(90),
  centerLongitude: z.number().min(-180).max(180),
  gridSize: z
    .number()
    .int()
    .refine((size) => LOCAL_GRID_SIZES.some((allowed) => allowed === size), {
      message: `Grid size must be one of ${LOCAL_GRID_SIZES.join(", ")}`,
    }),
  spacingKm: z
    .number()
    .min(MIN_LOCAL_GRID_SPACING_KM)
    .max(MAX_LOCAL_GRID_SPACING_KM),
  device: z.enum(["desktop", "mobile"]),
  languageCode: z
    .string()
    .refine(isSupportedLanguageCode, { message: "Unsupported language" })
    .optional(),
});

export type CreateLocalGridInput = z.infer<typeof createLocalGridSchema>;

export const localGridProjectSchema = z.object({ projectId });

export const localGridSchema = z.object({
  projectId,
  gridId: z.string().uuid(),
});

export const localGridRunSchema = z.object({
  projectId,
  runId: z.string().uuid(),
});

export const localGridPointSchema = z.object({
  projectId,
  runId: z.string().uuid(),
  pointId: z.string().uuid(),
});
