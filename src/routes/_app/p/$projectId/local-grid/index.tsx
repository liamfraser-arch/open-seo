import { createFileRoute } from "@tanstack/react-router";
import { LocalGridList } from "@/client/features/local-grid/LocalGridList";

export const Route = createFileRoute("/_app/p/$projectId/local-grid/")({
  component: LocalGridIndex,
});

function LocalGridIndex() {
  const { projectId } = Route.useParams();
  return <LocalGridList projectId={projectId} />;
}
