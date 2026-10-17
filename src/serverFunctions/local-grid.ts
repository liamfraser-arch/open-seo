import { env, waitUntil } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { LocalGridService } from "@/server/features/local-grid/LocalGridService";
import { captureServerEvent } from "@/server/lib/posthog";
import {
  requirePortalProjectContext,
  requirePortalSession,
  requireProjectContext,
} from "@/serverFunctions/middleware";
import {
  createLocalGridSchema,
  localGridPointSchema,
  localGridProjectSchema,
  localGridRunSchema,
  localGridSchema,
} from "@/types/schemas/local-grid";

/**
 * The Maps JavaScript API key is a browser key by design (Google restricts it
 * by HTTP referrer), so handing it to signed-in users exposes nothing new.
 * Null means the page draws the grid without a map.
 */
export const getLocalGridMapsKey = createServerFn({ method: "GET" })
  .middleware(requirePortalSession)
  .handler(() => ({
    apiKey: env.GOOGLE_MAPS_API_KEY?.trim() || null,
    // Pins are Advanced Markers, which need a map id. Google's demo id works
    // without setup; a deployment can set its own to style the map.
    mapId: env.GOOGLE_MAPS_MAP_ID?.trim() || "DEMO_MAP_ID",
  }));

export const listLocalGrids = createServerFn({ method: "POST" })
  .middleware(requirePortalProjectContext)
  .validator(localGridProjectSchema)
  .handler(({ context }) =>
    LocalGridService.listGridsWithLatestRun(context.projectId),
  );

export const createLocalGrid = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(createLocalGridSchema)
  .handler(async ({ data, context }) => {
    const result = await LocalGridService.createGrid(
      { id: context.projectId, languageCode: context.project.languageCode },
      data,
    );
    waitUntil(
      captureServerEvent({
        distinctId: context.userId,
        event: "local_grid:create",
        organizationId: context.organizationId,
        properties: {
          project_id: context.projectId,
          grid_size: data.gridSize,
        },
      }),
    );
    return result;
  });

export const deleteLocalGrid = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(localGridSchema)
  .handler(({ data, context }) =>
    LocalGridService.deleteGrid(context.projectId, data.gridId),
  );

export const getLocalGrid = createServerFn({ method: "POST" })
  .middleware(requirePortalProjectContext)
  .validator(localGridSchema)
  .handler(({ data, context }) =>
    LocalGridService.getGridDetail(context.projectId, data.gridId),
  );

export const runLocalGrid = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(localGridSchema)
  .handler(async ({ data, context }) => {
    const result = await LocalGridService.startRun({
      projectId: context.projectId,
      gridId: data.gridId,
      billingCustomer: context,
    });
    waitUntil(
      captureServerEvent({
        distinctId: context.userId,
        event: "local_grid:run",
        organizationId: context.organizationId,
        properties: { project_id: context.projectId },
      }),
    );
    return result;
  });

export const getLocalGridRun = createServerFn({ method: "POST" })
  .middleware(requirePortalProjectContext)
  .validator(localGridRunSchema)
  .handler(({ data, context }) =>
    LocalGridService.getRunDetail(context.projectId, data.runId),
  );

export const getLocalGridPointResults = createServerFn({ method: "POST" })
  .middleware(requirePortalProjectContext)
  .validator(localGridPointSchema)
  .handler(({ data, context }) =>
    LocalGridService.getPointResults(
      context.projectId,
      data.runId,
      data.pointId,
    ),
  );
