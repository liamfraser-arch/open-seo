import { useQuery } from "@tanstack/react-query";
import { QueryError } from "@/client/components/QueryState";
import { SkeletonPage } from "@/client/components/SkeletonPresets";
import { Button } from "@/client/components/ui/button";
import { Card } from "@/client/components/ui/card";
import { LocalGridDetail } from "@/client/features/local-grid/LocalGridDetail";
import { listLocalGrids } from "@/serverFunctions/local-grid";

/** The branded shell around every portal page. */
export function PortalShell({
  title,
  email,
  children,
}: {
  title?: string;
  email?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 md:px-6">
          <img src="/transparent-logo.png" alt="" className="size-7" />
          <span className="text-base font-semibold">SerpSurfers</span>
          {title ? (
            <span className="truncate text-sm text-muted-foreground">
              / {title}
            </span>
          ) : null}
          {email ? (
            <span className="ml-auto hidden truncate text-xs text-muted-foreground sm:block">
              {email}
            </span>
          ) : null}
        </div>
      </header>
      <main className="mx-auto max-w-7xl space-y-4 px-4 py-6 md:px-6">
        {children}
      </main>
    </div>
  );
}

/** A client's live view of one project: its Local Grids, read-only. */
export function PortalProject({
  projectId,
  gridId,
  runId,
  onSelect,
}: {
  projectId: string;
  gridId: string | undefined;
  runId: string | undefined;
  onSelect: (next: { gridId: string; runId?: string }) => void;
}) {
  const gridsQuery = useQuery({
    queryKey: ["localGrids", projectId],
    queryFn: () => listLocalGrids({ data: { projectId } }),
  });

  if (gridsQuery.isPending) return <SkeletonPage />;
  if (gridsQuery.isError) {
    return (
      <QueryError
        error={gridsQuery.error}
        fallback="Failed to load your dashboard"
        onRetry={() => void gridsQuery.refetch()}
        isRetrying={gridsQuery.isFetching}
      />
    );
  }

  const grids = gridsQuery.data;
  if (grids.length === 0) {
    return (
      <Card className="px-5 py-10 text-center text-sm text-muted-foreground">
        Your first report is on its way. Check back soon.
      </Card>
    );
  }

  const activeGridId =
    grids.find((grid) => grid.id === gridId)?.id ?? grids[0].id;

  return (
    <>
      {grids.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {grids.map((grid) => (
            <Button
              key={grid.id}
              size="sm"
              variant={grid.id === activeGridId ? "default" : "outline"}
              onClick={() => onSelect({ gridId: grid.id })}
            >
              {grid.keyword}
            </Button>
          ))}
        </div>
      ) : null}
      <LocalGridDetail
        key={activeGridId}
        readOnly
        projectId={projectId}
        gridId={activeGridId}
        selectedRunId={runId}
        onSelectRun={(next) => onSelect({ gridId: activeGridId, runId: next })}
      />
    </>
  );
}
