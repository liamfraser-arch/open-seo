import { createFileRoute, Outlet, useParams } from "@tanstack/react-router";
import { BackLink, PageHeader } from "@/client/components/PageHeader";

export const Route = createFileRoute("/_app/p/$projectId/citations")({
  component: CitationsLayout,
});

function CitationsLayout() {
  // Only the check detail route has a check id, and only it links back.
  const { projectId, checkId } = useParams({ strict: false });

  return (
    <div className="px-4 py-4 pb-24 overflow-auto md:px-6 md:py-6 md:pb-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <PageHeader
          title="Citations"
          description="Find the directories that list your business, like Yelp, BBB and Facebook"
          backLink={
            projectId && checkId ? (
              <BackLink to="/p/$projectId/citations" params={{ projectId }}>
                All checks
              </BackLink>
            ) : undefined
          }
        />

        <Outlet />
      </div>
    </div>
  );
}
