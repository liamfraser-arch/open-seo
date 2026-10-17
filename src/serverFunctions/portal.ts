import { createServerFn } from "@tanstack/react-start";
import { PortalService } from "@/server/features/portal/PortalService";
import { PortalRepository } from "@/server/features/portal/PortalRepository";
import { ProjectRepository } from "@/server/features/projects/repositories/ProjectRepository";
import {
  requirePortalProjectContext,
  requirePortalSession,
  requireProjectContext,
} from "@/serverFunctions/middleware";
import {
  addPortalClientSchema,
  portalProjectSchema,
  removePortalClientSchema,
  savePortalContentSchema,
} from "@/types/schemas/portal";

/**
 * Who is looking at the portal and which projects they can open. A client
 * sees only the projects they were added to; staff see them all, so they can
 * preview what a client sees.
 */
export const getPortalSession = createServerFn({ method: "GET" })
  .middleware(requirePortalSession)
  .handler(async ({ context }) => {
    const projects = await ProjectRepository.listProjects(
      context.organizationId,
    );
    const visible = context.portalProjectIds
      ? projects.filter((project) =>
          context.portalProjectIds?.includes(project.id),
        )
      : projects;
    return {
      isClient: context.role === "client",
      email: context.userEmail,
      projects: visible.map((project) => ({
        id: project.id,
        name: project.name,
        domain: project.domain,
      })),
    };
  });

export const listPortalClients = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(portalProjectSchema)
  .handler(({ context }) => PortalRepository.listForProject(context.projectId));

export const addPortalClient = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(addPortalClientSchema)
  .handler(({ data, context }) =>
    PortalRepository.add(context.projectId, data.email),
  );

export const removePortalClient = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(removePortalClientSchema)
  .handler(({ data, context }) =>
    PortalRepository.remove(context.projectId, data.clientId),
  );

/** Everything the client dashboard shows; staff read it to edit it. */
export const getPortalOverview = createServerFn({ method: "POST" })
  .middleware(requirePortalProjectContext)
  .validator(portalProjectSchema)
  .handler(({ context }) => PortalService.getOverview(context.projectId));

export const savePortalContent = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(savePortalContentSchema)
  .handler(({ data, context }) => {
    const { projectId: _projectId, ...content } = data;
    return PortalService.saveContent(context.projectId, content);
  });

/** Search Console clicks over time, when the project has it connected. */
export const getPortalTraffic = createServerFn({ method: "POST" })
  .middleware(requirePortalProjectContext)
  .validator(portalProjectSchema)
  .handler(({ context }) => PortalService.getTraffic(context.projectId));
