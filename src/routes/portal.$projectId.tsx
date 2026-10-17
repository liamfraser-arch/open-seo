import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import {
  PORTAL_TABS,
  PortalDashboard,
} from "@/client/features/portal/PortalDashboard";
import { PortalShell } from "@/client/features/portal/PortalPage";
import { getPortalSession } from "@/serverFunctions/portal";

const searchSchema = z.object({
  // Staff-only sample data, so a dashboard can be shown full of results.
  demo: z
    .unknown()
    .transform((value) => value === 1 || value === "1" || value === true)
    .optional(),
  tab: z.enum(PORTAL_TABS).optional().catch(undefined),
  grid: z.string().uuid().optional().catch(undefined),
  run: z.string().uuid().optional().catch(undefined),
});

export const Route = createFileRoute("/portal/$projectId")({
  validateSearch: searchSchema,
  component: PortalProjectRoute,
});

function PortalProjectRoute() {
  const { projectId } = Route.useParams();
  const { tab, grid, run, demo } = Route.useSearch();
  const navigate = Route.useNavigate();
  const sessionQuery = useQuery({
    queryKey: ["portalSession"],
    queryFn: () => getPortalSession(),
  });
  const project = sessionQuery.data?.projects.find(
    (entry) => entry.id === projectId,
  );

  return (
    <PortalShell title={project?.name} email={sessionQuery.data?.email}>
      <PortalDashboard
        projectId={projectId}
        tab={tab ?? "overview"}
        demo={Boolean(demo) && sessionQuery.data?.isClient === false}
        onTab={(next) =>
          void navigate({
            search: (previous) => ({ ...previous, tab: next }),
            replace: true,
          })
        }
        gridId={grid}
        runId={run}
        onSelectGrid={(next) =>
          void navigate({
            search: (previous) => ({
              ...previous,
              tab: "grid",
              grid: next.gridId,
              run: next.runId,
            }),
            replace: true,
          })
        }
      />
    </PortalShell>
  );
}
