import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { LocalGridDetail } from "@/client/features/local-grid/LocalGridDetail";

const searchSchema = z.object({
  run: z.string().uuid().optional().catch(undefined),
});

export const Route = createFileRoute("/_app/p/$projectId/local-grid/$gridId")({
  validateSearch: searchSchema,
  component: LocalGridRoute,
});

function LocalGridRoute() {
  const { projectId, gridId } = Route.useParams();
  const { run } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <LocalGridDetail
      projectId={projectId}
      gridId={gridId}
      selectedRunId={run}
      onSelectRun={(runId) =>
        void navigate({ search: { run: runId }, replace: true })
      }
    />
  );
}
