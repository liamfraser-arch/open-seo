import { createFileRoute } from "@tanstack/react-router";
import { CitationList } from "@/client/features/citations/CitationList";

export const Route = createFileRoute("/_app/p/$projectId/citations/")({
  component: CitationsIndex,
});

function CitationsIndex() {
  const { projectId } = Route.useParams();
  return <CitationList projectId={projectId} />;
}
