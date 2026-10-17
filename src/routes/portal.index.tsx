import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { QueryError } from "@/client/components/QueryState";
import { SkeletonPage } from "@/client/components/SkeletonPresets";
import { Button } from "@/client/components/ui/button";
import { Card } from "@/client/components/ui/card";
import { PortalShell } from "@/client/features/portal/PortalPage";
import { getPortalSession } from "@/serverFunctions/portal";

export const Route = createFileRoute("/portal/")({
  component: PortalHome,
});

function PortalHome() {
  const navigate = useNavigate();
  const sessionQuery = useQuery({
    queryKey: ["portalSession"],
    queryFn: () => getPortalSession(),
  });
  const session = sessionQuery.data;

  // A client with one project goes straight to it.
  useEffect(() => {
    if (session?.projects.length === 1) {
      void navigate({
        to: "/portal/$projectId",
        params: { projectId: session.projects[0].id },
        replace: true,
      });
    }
  }, [session, navigate]);

  return (
    <PortalShell email={session?.email}>
      {sessionQuery.isError ? (
        <QueryError
          error={sessionQuery.error}
          fallback="Failed to load your account"
          onRetry={() => void sessionQuery.refetch()}
          isRetrying={sessionQuery.isFetching}
        />
      ) : !session || session.projects.length === 1 ? (
        <SkeletonPage />
      ) : session.projects.length === 0 ? (
        <Card className="px-5 py-10 text-center text-sm text-muted-foreground">
          No dashboards are shared with this account yet.
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {session.projects.map((project) => (
            <Card key={project.id} className="gap-2 px-5 py-4">
              <p className="font-semibold">{project.name}</p>
              <p className="text-sm text-muted-foreground">{project.domain}</p>
              <Button
                size="sm"
                className="self-start"
                nativeButton={false}
                render={<a href={`/portal/${project.id}`} />}
              >
                Open dashboard
              </Button>
            </Card>
          ))}
        </div>
      )}
    </PortalShell>
  );
}
