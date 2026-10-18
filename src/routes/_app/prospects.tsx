import { createFileRoute, Outlet, useParams } from "@tanstack/react-router";
import { BackLink, PageHeader } from "@/client/components/PageHeader";

export const Route = createFileRoute("/_app/prospects")({
  component: ProspectsLayout,
});

function ProspectsLayout() {
  // Only the search detail route has a search id, and only it links back.
  const { searchId } = useParams({ strict: false });

  return (
    <div className="px-4 py-4 pb-24 overflow-auto md:px-6 md:py-6 md:pb-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <PageHeader
          title="Prospects"
          description="Find local businesses that could use help getting found on Google, then turn the ones you win into clients"
          backLink={
            searchId ? (
              <BackLink to="/prospects">All searches</BackLink>
            ) : undefined
          }
        />

        <Outlet />
      </div>
    </div>
  );
}
