import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  GscNotConnectedError,
  GscService,
  isExpectedGrantFailure,
} from "@/server/features/gsc/services/GscService";
import { toDimensionRows } from "@/server/features/gsc/searchPerformanceReport";
import { toWeeklyGrowth } from "@/server/features/gsc/searchGrowth";
import { requireProjectContext } from "@/serverFunctions/middleware";

const projectSchema = z.object({ projectId: z.string().min(1) });
const growthSchema = projectSchema.extend({
  query: z.string().trim().min(1).max(500),
});

/** Not connected, or a dead grant: the page shows its not-connected state. */
function isNotConnected(error: unknown) {
  return error instanceof GscNotConnectedError || isExpectedGrantFailure(error);
}

/** The searches that brought the most clicks over the last three months. */
export const getTopSearchQueries = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(projectSchema)
  .handler(async ({ context }) => {
    try {
      const result = await GscService.getPerformance({
        projectId: context.projectId,
        dimensions: ["query"],
        dateRange: "last_3_months",
        rowLimit: 30,
      });
      return { connected: true as const, rows: toDimensionRows(result.rows) };
    } catch (error) {
      if (isNotConnected(error)) return { connected: false as const };
      throw error;
    }
  });

/** One search's clicks, impressions and position, week by week for six months. */
export const getSearchQueryGrowth = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(growthSchema)
  .handler(async ({ data, context }) => {
    try {
      const result = await GscService.getPerformance({
        projectId: context.projectId,
        dimensions: ["date"],
        dateRange: "last_6_months",
        filters: [
          { dimension: "query", operator: "equals", expression: data.query },
        ],
        // One row per day for about 190 days.
        rowLimit: 250,
      });
      return { connected: true as const, weeks: toWeeklyGrowth(result.rows) };
    } catch (error) {
      if (isNotConnected(error)) return { connected: false as const };
      throw error;
    }
  });
