import { z } from "zod";
import {
  MILESTONE_STATUSES,
  PORTAL_STRATEGY_MONTHS,
} from "@/shared/portal-content";

const projectId = z.string().uuid();

export const portalProjectSchema = z.object({ projectId });

export const addPortalClientSchema = z.object({
  projectId,
  email: z.string().trim().toLowerCase().email().max(254),
});

export const removePortalClientSchema = z.object({
  projectId,
  clientId: z.string().min(1).max(64),
});

const position = z.number().int().min(1).max(100).nullable();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const savePortalContentSchema = z.object({
  projectId,
  startDate: isoDate,
  summary: z.string().trim().max(400),
  milestones: z
    .array(
      z.object({
        month: z.number().int().min(1).max(PORTAL_STRATEGY_MONTHS),
        title: z.string().trim().min(1).max(160),
        detail: z.string().trim().max(600),
        status: z.enum(MILESTONE_STATUSES),
      }),
    )
    .max(48),
  clusters: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(120),
        keywords: z
          .array(
            z.object({
              keyword: z.string().trim().min(1).max(160),
              monthlyVolume: z
                .number()
                .int()
                .min(0)
                .max(100_000_000)
                .nullable(),
              startPosition: position,
              currentPosition: position,
            }),
          )
          .max(25),
      }),
    )
    .max(12),
  wins: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(160),
        detail: z.string().trim().max(600),
        wonOn: isoDate,
      }),
    )
    .max(50),
});
