import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/client/components/ConfirmDialog";
import { QueryError } from "@/client/components/QueryState";
import { SkeletonPage } from "@/client/components/SkeletonPresets";
import { Button } from "@/client/components/ui/button";
import { Card } from "@/client/components/ui/card";
import {
  Table,
  TableBody,
  TableCard,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import {
  ProspectRow,
  STATUS_LABEL,
} from "@/client/features/prospects/ProspectRow";
import { projectsQueryOptions } from "@/client/features/projects/projectQueries";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import { createProject } from "@/serverFunctions/projects";
import {
  deleteProspectSearch,
  getProspectSearch,
  setProspectStatus,
} from "@/serverFunctions/prospects";
import { hasOwnWebsite, type ProspectStatus } from "@/shared/prospects";

type Detail = Awaited<ReturnType<typeof getProspectSearch>>;
type Prospect = Detail["prospects"][number];

export function ProspectDetail({ searchId }: { searchId: string }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<ProspectStatus | "all">("all");
  const [converting, setConverting] = useState<Prospect | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const detailQuery = useQuery({
    queryKey: ["prospectSearch", searchId],
    queryFn: () => getProspectSearch({ data: { searchId } }),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({
      queryKey: ["prospectSearch", searchId],
    });
    void queryClient.invalidateQueries({ queryKey: ["prospectSearches"] });
  };

  const statusMutation = useMutation({
    mutationFn: (vars: { prospectId: string; status: ProspectStatus }) =>
      setProspectStatus({ data: vars }),
    onSuccess: refresh,
  });

  // A won prospect becomes a client: its own project, in the market it was
  // found in, where its rankings, grids and reports live.
  const convertMutation = useMutation({
    mutationFn: async (prospect: Prospect) => {
      const project = await createProject({
        data: {
          name: prospect.title,
          domain: hasOwnWebsite(prospect.domain, prospect.url)
            ? (prospect.domain ?? undefined)
            : undefined,
          locationCode: detailQuery.data?.search.locationCode,
        },
      });
      await setProspectStatus({
        data: { prospectId: prospect.id, status: "won" },
      });
      return project;
    },
    onSuccess: (project) => {
      setConverting(null);
      refresh();
      void queryClient.invalidateQueries({
        queryKey: projectsQueryOptions().queryKey,
      });
      toast.success(`Created the project “${project.name}”`);
      void navigate({
        to: "/p/$projectId",
        params: { projectId: project.id },
      });
    },
    onError: (error) => {
      setConverting(null);
      toast.error(
        getStandardErrorMessage(error, "The project was not created."),
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteProspectSearch({ data: { searchId } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["prospectSearches"] });
      toast.success("Search deleted");
      void navigate({ to: "/prospects" });
    },
  });

  if (detailQuery.isPending) return <SkeletonPage />;
  if (detailQuery.isError) {
    return (
      <QueryError
        error={detailQuery.error}
        fallback="Failed to load this search"
        onRetry={() => void detailQuery.refetch()}
        isRetrying={detailQuery.isFetching}
      />
    );
  }

  const { search, prospects } = detailQuery.data;
  const counts = (status: ProspectStatus) =>
    prospects.filter((row) => row.status === status).length;
  const shown =
    filter === "all"
      ? prospects.filter((row) => row.status !== "passed")
      : prospects.filter((row) => row.status === filter);

  return (
    <div className="space-y-4">
      <Card className="flex-row flex-wrap items-center gap-3 px-5 py-4">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold">{search.keyword}</h2>
          <p className="truncate text-sm text-muted-foreground">
            {search.locationName.split(",").slice(0, 2).join(",")} ·{" "}
            {prospects.length} businesses found
          </p>
        </div>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Delete search"
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 />
        </Button>
      </Card>

      <div className="flex flex-wrap gap-2">
        <FilterButton
          active={filter === "all"}
          onClick={() => setFilter("all")}
          label="To review"
          count={prospects.length - counts("passed")}
        />
        {(["contacted", "won", "passed"] as const).map((status) => (
          <FilterButton
            key={status}
            active={filter === status}
            onClick={() => setFilter(status)}
            label={STATUS_LABEL[status]}
            count={counts(status)}
          />
        ))}
      </div>

      <TableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Need</TableHead>
              <TableHead>Business</TableHead>
              <TableHead>Why they need help</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="w-36">Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-8 text-center text-muted-foreground"
                >
                  Nothing here.
                </TableCell>
              </TableRow>
            ) : (
              shown.map((prospect) => (
                <ProspectRow
                  key={prospect.id}
                  prospect={prospect}
                  onStatus={(status) =>
                    statusMutation.mutate({ prospectId: prospect.id, status })
                  }
                  onCreateClient={() => setConverting(prospect)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </TableCard>

      {converting ? (
        <ConfirmDialog
          title="Make this a client project?"
          confirmLabel="Create project"
          pending={convertMutation.isPending}
          onConfirm={() => convertMutation.mutate(converting)}
          onClose={() => setConverting(null)}
        >
          Creates a project for “{converting.title}” and marks the prospect as
          won. You can then track its rankings, map visibility and directory
          listings there.
        </ConfirmDialog>
      ) : null}
      {confirmDelete ? (
        <ConfirmDialog
          title="Delete this search?"
          confirmLabel="Delete"
          destructive
          pending={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate()}
          onClose={() => setConfirmDelete(false)}
        >
          Deletes the search and its list of businesses, including which ones
          you contacted.
        </ConfirmDialog>
      ) : null}
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <Button
      size="sm"
      variant={active ? "secondary" : "outline"}
      onClick={onClick}
    >
      {label}
      <span className="ml-1 tabular-nums text-muted-foreground">{count}</span>
    </Button>
  );
}
