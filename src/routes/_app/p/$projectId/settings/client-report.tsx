import { createFileRoute } from "@tanstack/react-router";
import { ClientReportEditor } from "@/client/features/portal/ClientReportEditor";

export const Route = createFileRoute(
  "/_app/p/$projectId/settings/client-report",
)({ component: ClientReportRoute });

function ClientReportRoute() {
  const { projectId } = Route.useParams();
  return <ClientReportEditor projectId={projectId} />;
}
