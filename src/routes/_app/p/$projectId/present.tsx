import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { PresentPage } from "@/client/features/present/PresentPage";

const searchSchema = z.object({
  section: z
    .enum(["overview", "progress", "map", "rankings", "listings", "search"])
    .optional()
    .catch(undefined),
  // ?demo=1 fills Search Console with marked sample numbers, for rehearsing.
  // The URL parser reads 1 as a number, so accept it either way.
  demo: z
    .union([z.literal(1), z.literal("1"), z.literal(true)])
    .transform(() => true as const)
    .optional()
    .catch(undefined),
});

export const Route = createFileRoute("/_app/p/$projectId/present")({
  validateSearch: searchSchema,
  component: PresentRoute,
});

function PresentRoute() {
  const { projectId } = Route.useParams();
  const { section, demo } = Route.useSearch();
  return (
    <PresentPage
      projectId={projectId}
      section={section ?? "overview"}
      demo={demo === true}
    />
  );
}
