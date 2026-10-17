import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronRight, Grid3x3, Plus } from "lucide-react";
import { EmptyState } from "@/client/components/EmptyState";
import { QueryError } from "@/client/components/QueryState";
import { Button } from "@/client/components/ui/button";
import {
  Card,
  CardAction,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";
import { Skeleton } from "@/client/components/ui/skeleton";
import { formatRunDate } from "@/client/features/local-grid/format";
import { NewLocalGridDialog } from "@/client/features/local-grid/NewLocalGridDialog";
import { listLocalGrids } from "@/serverFunctions/local-grid";

type GridRow = Awaited<ReturnType<typeof listLocalGrids>>[number];

export function LocalGridList({ projectId }: { projectId: string }) {
  const [showNew, setShowNew] = useState(false);
  const gridsQuery = useQuery({
    queryKey: ["localGrids", projectId],
    queryFn: () => listLocalGrids({ data: { projectId } }),
  });
  const grids = gridsQuery.data;

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="px-5 pt-4 pb-3">
        <CardTitle>
          <h2 className="text-sm font-semibold">Grids</h2>
        </CardTitle>
        <CardAction className="self-center">
          <Button size="sm" onClick={() => setShowNew(true)}>
            <Plus data-icon="inline-start" />
            New grid
          </Button>
        </CardAction>
      </CardHeader>
      <div className="divide-y divide-border border-t border-border">
        {gridsQuery.isError ? (
          <div className="px-5 py-4">
            <QueryError
              error={gridsQuery.error}
              fallback="Failed to load local grids"
              onRetry={() => void gridsQuery.refetch()}
              isRetrying={gridsQuery.isFetching}
            />
          </div>
        ) : gridsQuery.isPending ? (
          <div className="space-y-4 px-5 py-4" aria-busy>
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-72" />
              </div>
            ))}
          </div>
        ) : !grids || grids.length === 0 ? (
          <EmptyState
            variant="plain"
            icon={Grid3x3}
            title="No local grids yet"
            description="Pick a business and a keyword to map where it ranks on Google Maps around its location."
          />
        ) : (
          grids.map((grid) => (
            <GridListRow key={grid.id} projectId={projectId} grid={grid} />
          ))
        )}
      </div>
      {showNew ? (
        <NewLocalGridDialog
          projectId={projectId}
          onClose={() => setShowNew(false)}
        />
      ) : null}
    </Card>
  );
}

function GridListRow({
  projectId,
  grid,
}: {
  projectId: string;
  grid: GridRow;
}) {
  const run = grid.latestRun;
  return (
    <Link
      to="/p/$projectId/local-grid/$gridId"
      params={{ projectId, gridId: grid.id }}
      className="flex items-center gap-4 px-5 py-3 hover:bg-muted/50"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{grid.keyword}</p>
        <p className="truncate text-xs text-muted-foreground">
          {grid.businessName} · {grid.gridSize}×{grid.gridSize},{" "}
          {grid.spacingKm} km · {grid.device}
        </p>
      </div>
      <div className="hidden text-right text-xs text-muted-foreground sm:block">
        {!run ? (
          "Not run yet"
        ) : run.status === "pending" ? (
          "Running…"
        ) : run.status === "failed" ? (
          "Last run failed"
        ) : (
          <>
            <p className="text-sm text-foreground tabular-nums">
              Avg rank {run.averageRank ?? "—"} · Top 3 at{" "}
              {run.shareOfLocalVoice ?? 0}%
            </p>
            <p>{formatRunDate(run.startedAt)}</p>
          </>
        )}
      </div>
      <ChevronRight className="size-4 text-muted-foreground" />
    </Link>
  );
}
