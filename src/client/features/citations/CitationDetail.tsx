import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Play, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/client/components/ConfirmDialog";
import { QueryError } from "@/client/components/QueryState";
import { SkeletonPage } from "@/client/components/SkeletonPresets";
import { Button } from "@/client/components/ui/button";
import { Card } from "@/client/components/ui/card";
import { Skeleton } from "@/client/components/ui/skeleton";
import { Spinner } from "@/client/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui/select";
import {
  Table,
  TableBody,
  TableCard,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import { ReferenceNap } from "@/client/features/citations/ListingNap";
import { ResultRow } from "@/client/features/citations/ResultRow";
import { formatCitationCheckCost } from "@/client/features/citations/format";
import { formatRunDate } from "@/client/features/local-grid/format";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import {
  deleteCitationCheck,
  getCitationCheck,
  getCitationRun,
  processCitationRun,
  retryCitationRun,
  runCitationCheck,
} from "@/serverFunctions/citations";

const POLL_MS = 4000;

type RunDetail = Awaited<ReturnType<typeof getCitationRun>>;

export function CitationDetail({
  projectId,
  checkId,
  selectedRunId,
  onSelectRun,
  readOnly = false,
}: {
  projectId: string;
  checkId: string;
  selectedRunId: string | undefined;
  onSelectRun: (runId: string) => void;
  /** The client portal: no running, no deleting. */
  readOnly?: boolean;
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState<"run" | "delete" | null>(null);

  const checkQuery = useQuery({
    queryKey: ["citationCheck", projectId, checkId],
    queryFn: () => getCitationCheck({ data: { projectId, checkId } }),
  });
  const runs = checkQuery.data?.runs ?? [];
  const runId = selectedRunId ?? runs[0]?.id;

  const runQuery = useQuery({
    queryKey: ["citationRun", projectId, runId],
    queryFn: () => getCitationRun({ data: { projectId, runId: runId ?? "" } }),
    enabled: Boolean(runId),
    // Read-only viewers only watch; staff drive the run below.
    refetchInterval: (query) =>
      query.state.data?.run.status === "pending" ? POLL_MS : false,
  });
  const runStatus = runQuery.data?.run.status;
  const refetchRun = runQuery.refetch;

  // Checking spends credits, so only staff drive it: call for the next batch
  // of directories until the run settles.
  const driving = useRef<string | null>(null);
  useEffect(() => {
    if (readOnly || !runId || runStatus !== "pending") return;
    if (driving.current === runId) return;
    driving.current = runId;
    void (async () => {
      try {
        for (let done = false; !done; ) {
          ({ done } = await processCitationRun({ data: { projectId, runId } }));
          await refetchRun();
        }
      } catch (error) {
        toast.error(getStandardErrorMessage(error, "The check stopped early."));
      } finally {
        driving.current = null;
      }
    })();
  }, [readOnly, runId, runStatus, projectId, refetchRun]);

  // History rows carry run summaries; refresh them once a run settles.
  useEffect(() => {
    if (runStatus && runStatus !== "pending") {
      void queryClient.invalidateQueries({
        queryKey: ["citationCheck", projectId, checkId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["citationChecks", projectId],
      });
    }
  }, [runStatus, queryClient, projectId, checkId]);

  const runMutation = useMutation({
    mutationFn: () => runCitationCheck({ data: { projectId, checkId } }),
    onSuccess: async ({ runId: newRunId }) => {
      setConfirm(null);
      await queryClient.invalidateQueries({
        queryKey: ["citationCheck", projectId, checkId],
      });
      onSelectRun(newRunId);
    },
    onError: () => setConfirm(null),
  });

  const retryMutation = useMutation({
    mutationFn: (retryRunId: string) =>
      retryCitationRun({ data: { projectId, runId: retryRunId } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["citationRun", projectId, runId],
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteCitationCheck({ data: { projectId, checkId } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["citationChecks", projectId],
      });
      toast.success("Check deleted");
      void navigate({ to: "/p/$projectId/citations", params: { projectId } });
    },
  });

  if (checkQuery.isPending) return <SkeletonPage />;
  if (checkQuery.isError) {
    return (
      <QueryError
        error={checkQuery.error}
        fallback="Failed to load this check"
        onRetry={() => void checkQuery.refetch()}
        isRetrying={checkQuery.isFetching}
      />
    );
  }

  const { check } = checkQuery.data;
  const isRunning = runs.some((run) => run.status === "pending");
  const runItems = runs.map((run) => ({
    value: run.id,
    label: `${formatRunDate(run.startedAt)}${run.status === "pending" ? " · running" : run.status === "failed" ? " · failed" : ""}`,
  }));

  return (
    <div className="space-y-4">
      <Card className="flex-row flex-wrap items-center gap-3 px-5 py-4">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold">
            {check.businessName}
          </h2>
          <p className="truncate text-sm text-muted-foreground">
            {check.city ?? "All cities"}
          </p>
        </div>
        {runs.length > 1 ? (
          <Select
            items={runItems}
            value={runId ?? null}
            onValueChange={(next) => {
              if (next) onSelectRun(next);
            }}
          >
            <SelectTrigger size="sm" className="w-60" aria-label="Run">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {runItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                ? "Checking…"
                : runs.length
                  ? "Run again"
                  : "Run check"}
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Delete check"
              onClick={() => setConfirm("delete")}
            >
              <Trash2 />
            </Button>
          </>
        )}
      </Card>

      {!runId ? (
        <Card className="px-5 py-10 text-center text-sm text-muted-foreground">
          This check has not run yet.
        </Card>
      ) : runQuery.isError ? (
        <QueryError
          error={runQuery.error}
          fallback="Failed to load this run"
          onRetry={() => void runQuery.refetch()}
          isRetrying={runQuery.isFetching}
        />
      ) : !runQuery.data ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <RunView
          detail={runQuery.data}
          onRetry={
            readOnly || !runId
              ? undefined
              : {
                  run: () => retryMutation.mutate(runId),
                  pending: retryMutation.isPending,
                }
          }
        />
      )}

      {confirm === "run" ? (
        <ConfirmDialog
          title="Check every directory?"
          confirmLabel="Run now"
          pending={runMutation.isPending}
          onConfirm={() => runMutation.mutate()}
          onClose={() => setConfirm(null)}
        >
          Searches Google for “{check.businessName}” on each directory and lists
          the pages that mention it. Costs{" "}
          <span className="font-mono font-semibold text-foreground">
            {formatCitationCheckCost(check.locationCode)}
          </span>
          . Keep this page open until it finishes.
        </ConfirmDialog>
      ) : null}
      {confirm === "delete" ? (
        <ConfirmDialog
          title="Delete this check?"
          confirmLabel="Delete"
          destructive
          pending={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate()}
          onClose={() => setConfirm(null)}
        >
          Deletes the check and every past run of it.
        </ConfirmDialog>
      ) : null}
    </div>
  );
}

function RunView({
  detail,
  onRetry,
}: {
  detail: RunDetail;
  /** Staff only: searches again for the directories whose search failed. */
  onRetry?: { run: () => void; pending: boolean };
}) {
  const { run, results, reference } = detail;

  return (
    <div className="space-y-4">
      {run.status === "failed" ? (
        <Card className="px-5 py-4 text-sm text-destructive">
          {run.errorMessage ?? "This run failed."}
        </Card>
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        <Card className="gap-1 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Directories listing it
          </p>
          <p className="text-2xl font-semibold tabular-nums">
            {run.found}
            <span className="text-base font-normal text-muted-foreground">
              {" "}
              of {run.total}
            </span>
          </p>
        </Card>
        <Card className="gap-1 px-4 py-3">
          <p className="text-xs text-muted-foreground">Not found</p>
          <p className="text-2xl font-semibold tabular-nums">{run.missing}</p>
        </Card>
      </div>
      {run.status !== "pending" && run.errored > 0 && onRetry ? (
        <Card className="flex-row items-center gap-3 px-5 py-3 text-sm">
          <p className="flex-1">
            {run.errored} {run.errored === 1 ? "directory" : "directories"}{" "}
            could not be searched. Google's search service sometimes fails;
            trying again usually works.
          </p>
          <Button
            size="sm"
            variant="outline"
            disabled={onRetry.pending}
            onClick={onRetry.run}
          >
            Retry those
          </Button>
        </Card>
      ) : null}
      {run.status === "pending" ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner />
          Searched {run.total - run.unsettled} of {run.total} directories…
        </p>
      ) : null}
      <ReferenceNap reference={reference} />
      <TableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Directory</TableHead>
              <TableHead>Result</TableHead>
              <TableHead>Listings</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((result) => (
              <ResultRow
                key={result.id}
                result={result}
                reference={reference}
              />
            ))}
          </TableBody>
        </Table>
      </TableCard>
    </div>
  );
}
