import { createFileRoute } from "@tanstack/react-router";
import { ProspectList } from "@/client/features/prospects/ProspectList";

export const Route = createFileRoute("/_app/prospects/")({
  component: ProspectList,
});
