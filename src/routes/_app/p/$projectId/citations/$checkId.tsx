import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { CitationDetail } from "@/client/features/citations/CitationDetail";

const searchSchema = z.object({
  run: z.string().uuid().optional().catch(undefined),
});

export const Route = createFileRoute("/_app/p/$projectId/citations/$checkId")({
  validateSearch: searchSchema,
  component: CitationRoute,
});

function CitationRoute() {
  const { projectId, checkId } = Route.useParams();
  const { run } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <CitationDetail
      projectId={projectId}
      checkId={checkId}
      selectedRunId={run}
      onSelectRun={(runId) =>
        void navigate({ search: { run: runId }, replace: true })
      }
    />
  );
}
