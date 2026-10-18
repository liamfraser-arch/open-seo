import { waitUntil } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { ProspectService } from "@/server/features/prospects/ProspectService";
import { captureServerEvent } from "@/server/lib/posthog";
import { requireAuthenticatedContext } from "@/serverFunctions/middleware";
import {
  createProspectSearchSchema,
  prospectSearchSchema,
  setProspectStatusSchema,
} from "@/types/schemas/prospects";

// Prospects belong to the organization, not to a project: they are not
// clients yet.

export const listProspectSearches = createServerFn({ method: "POST" })
  .middleware(requireAuthenticatedContext)
  .handler(({ context }) =>
    ProspectService.listSearches(context.organizationId),
  );

export const createProspectSearch = createServerFn({ method: "POST" })
  .middleware(requireAuthenticatedContext)
  .validator(createProspectSearchSchema)
  .handler(async ({ data, context }) => {
    const result = await ProspectService.createSearch(
      context.organizationId,
      data,
      context,
    );
    waitUntil(
      captureServerEvent({
        distinctId: context.userId,
        event: "prospects:search",
        organizationId: context.organizationId,
      }),
    );
    return result;
  });

export const getProspectSearch = createServerFn({ method: "POST" })
  .middleware(requireAuthenticatedContext)
  .validator(prospectSearchSchema)
  .handler(({ data, context }) =>
    ProspectService.getSearchDetail(context.organizationId, data.searchId),
  );

export const setProspectStatus = createServerFn({ method: "POST" })
  .middleware(requireAuthenticatedContext)
  .validator(setProspectStatusSchema)
  .handler(({ data, context }) =>
    ProspectService.setStatus(
      context.organizationId,
      data.prospectId,
      data.status,
    ),
  );

export const deleteProspectSearch = createServerFn({ method: "POST" })
  .middleware(requireAuthenticatedContext)
  .validator(prospectSearchSchema)
  .handler(({ data, context }) =>
    ProspectService.deleteSearch(context.organizationId, data.searchId),
  );
