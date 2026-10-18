import { waitUntil } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { CitationService } from "@/server/features/citations/CitationService";
import { captureServerEvent } from "@/server/lib/posthog";
import {
  requirePortalProjectContext,
  requireProjectContext,
} from "@/serverFunctions/middleware";
import {
  citationCheckSchema,
  citationProjectSchema,
  citationRunSchema,
  createCitationCheckSchema,
} from "@/types/schemas/citations";

export const listCitationChecks = createServerFn({ method: "POST" })
  .middleware(requirePortalProjectContext)
  .validator(citationProjectSchema)
  .handler(({ context }) =>
    CitationService.listChecksWithLatestRun(context.projectId),
  );

export const createCitationCheck = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(createCitationCheckSchema)
  .handler(async ({ data, context }) => {
    const result = await CitationService.createCheck(context.project, data);
    waitUntil(
      captureServerEvent({
        distinctId: context.userId,
        event: "citations:create",
        organizationId: context.organizationId,
        properties: { project_id: context.projectId },
      }),
    );
    return result;
  });

export const deleteCitationCheck = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(citationCheckSchema)
  .handler(({ data, context }) =>
    CitationService.deleteCheck(context.projectId, data.checkId),
  );

export const getCitationCheck = createServerFn({ method: "POST" })
  .middleware(requirePortalProjectContext)
  .validator(citationCheckSchema)
  .handler(({ data, context }) =>
    CitationService.getCheckDetail(context.projectId, data.checkId),
  );

export const runCitationCheck = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(citationCheckSchema)
  .handler(async ({ data, context }) => {
    const result = await CitationService.startRun({
      projectId: context.projectId,
      checkId: data.checkId,
    });
    waitUntil(
      captureServerEvent({
        distinctId: context.userId,
        event: "citations:run",
        organizationId: context.organizationId,
        properties: { project_id: context.projectId },
      }),
    );
    return result;
  });

/** Checks the next batch of directories; staff only, because it spends credits. */
export const processCitationRun = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(citationRunSchema)
  .handler(({ data, context }) =>
    CitationService.processRun({
      projectId: context.projectId,
      runId: data.runId,
      billingCustomer: context,
    }),
  );

export const retryCitationRun = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(citationRunSchema)
  .handler(({ data, context }) =>
    CitationService.retryErrored(context.projectId, data.runId),
  );

export const getCitationRun = createServerFn({ method: "POST" })
  .middleware(requirePortalProjectContext)
  .validator(citationRunSchema)
  .handler(({ data, context }) =>
    CitationService.getRunDetail(context.projectId, data.runId),
  );

export const listCitationBusinessCandidates = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(citationProjectSchema)
  .handler(({ context }) =>
    CitationService.listBusinessCandidates(context.projectId),
  );
