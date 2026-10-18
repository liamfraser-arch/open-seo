import { createFileRoute } from "@tanstack/react-router";
import { ProspectDetail } from "@/client/features/prospects/ProspectDetail";

export const Route = createFileRoute("/_app/prospects/$searchId")({
  component: ProspectRoute,
});

function ProspectRoute() {
  const { searchId } = Route.useParams();
  return <ProspectDetail searchId={searchId} />;
}
