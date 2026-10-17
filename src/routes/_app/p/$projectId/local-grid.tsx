import { createFileRoute, Outlet, useParams } from "@tanstack/react-router";
import { BackLink, PageHeader } from "@/client/components/PageHeader";

export const Route = createFileRoute("/_app/p/$projectId/local-grid")({
  component: LocalGridLayout,
});

function LocalGridLayout() {
  // Only the grid detail route has a grid id, and only it links back.
  const { projectId, gridId } = useParams({ strict: false });

  return (
    <div className="px-4 py-4 pb-24 overflow-auto md:px-6 md:py-6 md:pb-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <PageHeader
          title="Local Grid"
          description="See where a business ranks on Google Maps across its area"
          backLink={
            projectId && gridId ? (
              <BackLink to="/p/$projectId/local-grid" params={{ projectId }}>
                All grids
              </BackLink>
            ) : undefined
          }
        />

        <Outlet />
      </div>
    </div>
  );
}
