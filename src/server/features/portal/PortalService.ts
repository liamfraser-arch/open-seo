import { sortBy } from "remeda";
import { resolveDateRange } from "@/server/features/gsc/searchAnalytics";
import {
  GscNotConnectedError,
  GscService,
  isExpectedGrantFailure,
} from "@/server/features/gsc/services/GscService";
import { LocalGridService } from "@/server/features/local-grid/LocalGridService";
import { PortalContentRepository } from "@/server/features/portal/PortalContentRepository";
import type { PortalContent } from "@/shared/portal-content";
import {
  YEAR_SHIFT_DAYS,
  shiftDate,
  summarizeTraffic,
  trafficWindow,
  type TrafficDay,
} from "@/shared/portal-traffic";

/** Local Grid results over time, one line per grid, oldest run first. */
async function getTrend(projectId: string) {
  const grids = await LocalGridService.listGridsWithLatestRun(projectId);
  return Promise.all(
    grids.map(async (grid) => {
      const { runs } = await LocalGridService.getGridDetail(projectId, grid.id);
      return {
        gridId: grid.id,
        keyword: grid.keyword,
        points: sortBy(
          runs.filter((run) => run.status === "completed"),
          (run) => run.startedAt,
        ).map((run) => ({
          date: run.startedAt,
          top3Share: run.shareOfLocalVoice,
          averageRank: run.averageRank,
        })),
      };
    }),
  );
}

async function getOverview(projectId: string) {
  const [content, trend] = await Promise.all([
    PortalContentRepository.getContent(projectId),
    getTrend(projectId),
  ]);
  return { content, trend };
}

async function saveContent(projectId: string, content: PortalContent) {
  await PortalContentRepository.replaceContent(projectId, content);
}

async function getDailyRows(
  projectId: string,
  startDate: string,
  endDate: string,
) {
  const result = await GscService.getPerformance({
    projectId,
    startDate,
    endDate,
    dimensions: ["date"],
    rowLimit: 400,
  });
  return result.rows.flatMap((row): TrafficDay[] =>
    row.keys?.[0]
      ? [
          {
            date: row.keys[0],
            clicks: row.clicks,
            impressions: row.impressions,
          },
        ]
      : [],
  );
}

/**
 * Search Console clicks for the last 3 months against the 3 months before and
 * the same 3 months a year ago. Not connected (or a dead connection) is
 * "no data", not an error: the client simply doesn't see the card.
 */
async function getTraffic(projectId: string) {
  const { endDate } = resolveDateRange({ dateRange: "last_28_days" });
  const window = trafficWindow(endDate);
  const sixMonthsStart = shiftDate(window.startDate, -91);
  const yearWindow = trafficWindow(shiftDate(endDate, -YEAR_SHIFT_DAYS));

  try {
    const [days, yearAgoDays] = await Promise.all([
      getDailyRows(projectId, sixMonthsStart, endDate),
      getDailyRows(projectId, yearWindow.startDate, yearWindow.endDate),
    ]);
    return {
      connected: true as const,
      ...summarizeTraffic({ days, yearAgoDays, endDate }),
    };
  } catch (error) {
    if (
      error instanceof GscNotConnectedError ||
      isExpectedGrantFailure(error)
    ) {
      return { connected: false as const };
    }
    throw error;
  }
}

export const PortalService = { getOverview, saveContent, getTraffic };
