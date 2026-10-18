import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronRight, ListChecks, Plus } from "lucide-react";
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
import { NewCitationCheckDialog } from "@/client/features/citations/NewCitationCheckDialog";
import { formatRunDate } from "@/client/features/local-grid/format";
import { listCitationChecks } from "@/serverFunctions/citations";

type CheckRow = Awaited<ReturnType<typeof listCitationChecks>>[number];

export function CitationList({ projectId }: { projectId: string }) {
  const [showNew, setShowNew] = useState(false);
  const checksQuery = useQuery({
    queryKey: ["citationChecks", projectId],
    queryFn: () => listCitationChecks({ data: { projectId } }),
  });
  const checks = checksQuery.data;

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="px-5 pt-4 pb-3">
        <CardTitle>
          <h2 className="text-sm font-semibold">Citation checks</h2>
        </CardTitle>
        <CardAction className="self-center">
          <Button size="sm" onClick={() => setShowNew(true)}>
            <Plus data-icon="inline-start" />
            New check
          </Button>
        </CardAction>
      </CardHeader>
      <div className="divide-y divide-border border-t border-border">
        {checksQuery.isError ? (
          <div className="px-5 py-4">
            <QueryError
              error={checksQuery.error}
              fallback="Failed to load citation checks"
              onRetry={() => void checksQuery.refetch()}
              isRetrying={checksQuery.isFetching}
            />
          </div>
        ) : checksQuery.isPending ? (
          <div className="space-y-4 px-5 py-4" aria-busy>
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-72" />
              </div>
            ))}
          </div>
        ) : !checks || checks.length === 0 ? (
          <EmptyState
            variant="plain"
            icon={ListChecks}
            title="No citation checks yet"
            description="Enter a business name to see which directories list it, with a link to each listing."
          />
        ) : (
          checks.map((check) => (
            <CheckListRow key={check.id} projectId={projectId} check={check} />
          ))
        )}
      </div>
      {showNew ? (
        <NewCitationCheckDialog
          projectId={projectId}
          onClose={() => setShowNew(false)}
        />
      ) : null}
    </Card>
  );
}

function CheckListRow({
  projectId,
  check,
}: {
  projectId: string;
  check: CheckRow;
}) {
  const run = check.latestRun;
  return (
    <Link
      to="/p/$projectId/citations/$checkId"
      params={{ projectId, checkId: check.id }}
      className="flex items-center gap-4 px-5 py-3 hover:bg-muted/50"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{check.businessName}</p>
        <p className="truncate text-xs text-muted-foreground">
          {check.city ?? "All cities"}
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
              Found on {run.found} of {run.total} directories
            </p>
            <p>{formatRunDate(run.startedAt)}</p>
          </>
        )}
      </div>
      <ChevronRight className="size-4 text-muted-foreground" />
    </Link>
  );
}
