import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowLeftRight, Play, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/client/components/ConfirmDialog";
import { QueryError } from "@/client/components/QueryState";
import { SkeletonPage } from "@/client/components/SkeletonPresets";
import { Button } from "@/client/components/ui/button";
import { Card } from "@/client/components/ui/card";
import { Skeleton } from "@/client/components/ui/skeleton";
import { Spinner } from "@/client/components/ui/spinner";
import { formatGridCost } from "@/client/features/local-grid/format";
import {
  RunHistory,
  RunPicker,
} from "@/client/features/local-grid/LocalGridHistory";
import {
  MapsProvider,
  useLocalGridMapsConfig,
} from "@/client/features/local-grid/LocalGridMap";
import { CompareView } from "@/client/features/local-grid/LocalGridCompare";
import { RunView } from "@/client/features/local-grid/LocalGridRunView";
import {
  deleteLocalGrid,
  getLocalGrid,
  getLocalGridRun,
  runLocalGrid,
} from "@/serverFunctions/local-grid";

const POLL_MS = 4000;

export function LocalGridDetail({
  projectId,
  gridId,
  selectedRunId,
  onSelectRun,
  readOnly = false,
}: {
  projectId: string;
  gridId: string;
  selectedRunId: string | undefined;
  onSelectRun: (runId: string) => void;
  /** The client portal: no running, no deleting. */
  readOnly?: boolean;
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const mapsConfig = useLocalGridMapsConfig();
  const [confirm, setConfirm] = useState<"run" | "delete" | null>(null);
  const [compare, setCompare] = useState<{
    beforeId: string;
    afterId: string;
  } | null>(null);

  const gridQuery = useQuery({
    queryKey: ["localGrid", projectId, gridId],
    queryFn: () => getLocalGrid({ data: { projectId, gridId } }),
  });
  const runs = gridQuery.data?.runs ?? [];
  const runId = selectedRunId ?? runs[0]?.id;

  const runQuery = useQuery({
    queryKey: ["localGridRun", projectId, runId],
    queryFn: () => getLocalGridRun({ data: { projectId, runId: runId ?? "" } }),
    enabled: Boolean(runId),
    // Each poll collects the searches that have finished since the last.
    refetchInterval: (query) =>
      query.state.data?.run.status === "pending" ? POLL_MS : false,
  });
  const runStatus = runQuery.data?.run.status;

  // History rows carry run summaries; refresh them once a run settles.
  useEffect(() => {
    if (runStatus && runStatus !== "pending") {
      void queryClient.invalidateQueries({
        queryKey: ["localGrid", projectId, gridId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["localGrids", projectId],
      });
    }
  }, [runStatus, queryClient, projectId, gridId]);

  const runMutation = useMutation({
    mutationFn: () => runLocalGrid({ data: { projectId, gridId } }),
    onSuccess: async ({ runId: newRunId }) => {
      setConfirm(null);
      await queryClient.invalidateQueries({
        queryKey: ["localGrid", projectId, gridId],
      });
      onSelectRun(newRunId);
    },
    onError: () => setConfirm(null),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteLocalGrid({ data: { projectId, gridId } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["localGrids", projectId],
      });
      toast.success("Grid deleted");
      void navigate({ to: "/p/$projectId/local-grid", params: { projectId } });
    },
  });

  if (gridQuery.isPending) return <SkeletonPage />;
  if (gridQuery.isError) {
    return (
      <QueryError
        error={gridQuery.error}
        fallback="Failed to load this grid"
        onRetry={() => void gridQuery.refetch()}
        isRetrying={gridQuery.isFetching}
      />
    );
  }

  const { grid } = gridQuery.data;
  const isRunning = runs.some((run) => run.status === "pending");
  // Runs come newest first; compare the two latest finished ones by default.
  const finishedRuns = runs.filter((run) => run.status === "completed");

  return (
    <MapsProvider apiKey={mapsConfig.data?.apiKey}>
      <div className="space-y-4">
        <Card className="flex-row flex-wrap items-center gap-3 px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold">{grid.keyword}</h2>
            <p className="truncate text-sm text-muted-foreground">
              {grid.businessName} · {grid.gridSize}×{grid.gridSize} grid,{" "}
              {grid.spacingKm} km apart · {grid.device}
            </p>
          </div>
          {finishedRuns.length > 1 ? (
            <Button
              size="sm"
              variant={compare ? "secondary" : "outline"}
              onClick={() =>
                setCompare(
                  compare
                    ? null
                    : {
                        beforeId: finishedRuns[1].id,
                        afterId: finishedRuns[0].id,
                      },
                )
              }
            >
              <ArrowLeftRight data-icon="inline-start" />
              Compare
            </Button>
          ) : null}
          {runs.length > 1 && !compare ? (
            <RunPicker runs={runs} value={runId} onChange={onSelectRun} />
          ) : null}
          {readOnly ? null : (
            <>
              <Button
                size="sm"
                disabled={isRunning || runMutation.isPending}
                onClick={() => setConfirm("run")}
              >
                {isRunning ? <Spinner /> : <Play data-icon="inline-start" />}
                {isRunning
                  ? "Running…"
                  : runs.length
                    ? "Run again"
                    : "Run grid"}
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Delete grid"
                onClick={() => setConfirm("delete")}
              >
                <Trash2 />
              </Button>
            </>
          )}
        </Card>

        {compare ? (
          <CompareView
            projectId={projectId}
            runs={runs}
            beforeId={compare.beforeId}
            afterId={compare.afterId}
            onChange={setCompare}
            center={{
              latitude: grid.centerLatitude,
              longitude: grid.centerLongitude,
            }}
            apiKey={mapsConfig.data?.apiKey}
            mapId={mapsConfig.data?.mapId ?? "DEMO_MAP_ID"}
          />
        ) : !runId ? (
          <Card className="px-5 py-10 text-center text-sm text-muted-foreground">
            This grid has not run yet.
          </Card>
        ) : runQuery.isError ? (
          <QueryError
            error={runQuery.error}
            fallback="Failed to load this run"
            onRetry={() => void runQuery.refetch()}
            isRetrying={runQuery.isFetching}
          />
        ) : !runQuery.data ? (
          <Skeleton className="h-[520px] w-full" />
        ) : (
          <RunView
            projectId={projectId}
            detail={runQuery.data}
            center={{
              latitude: grid.centerLatitude,
              longitude: grid.centerLongitude,
            }}
            apiKey={mapsConfig.data?.apiKey}
            mapId={mapsConfig.data?.mapId ?? "DEMO_MAP_ID"}
          />
        )}

        {runs.length > 1 && !compare ? (
          <RunHistory
            runs={runs}
            selectedRunId={runId}
            onSelect={onSelectRun}
          />
        ) : null}

        {confirm === "run" ? (
          <ConfirmDialog
            title={`Run ${grid.gridSize * grid.gridSize} searches?`}
            confirmLabel="Run now"
            pending={runMutation.isPending}
            onConfirm={() => runMutation.mutate()}
            onClose={() => setConfirm(null)}
          >
            Searches Google Maps for “{grid.keyword}” from every grid point.
            Costs about{" "}
            <span className="font-mono font-semibold text-foreground">
              {formatGridCost(grid.gridSize)}
            </span>
            . Results usually take under a minute.
          </ConfirmDialog>
        ) : null}
        {confirm === "delete" ? (
          <ConfirmDialog
            title="Delete this grid?"
            confirmLabel="Delete"
            destructive
            pending={deleteMutation.isPending}
            onConfirm={() => deleteMutation.mutate()}
            onClose={() => setConfirm(null)}
          >
            Deletes the grid and every past run of it.
          </ConfirmDialog>
        ) : null}
      </div>
    </MapsProvider>
  );
}
