import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/client/components/ui/skeleton";
import { Button } from "@/client/components/ui/button";
import { CitationDetail } from "@/client/features/citations/CitationDetail";
import { AuditHealthCard } from "@/client/features/dashboard/DashboardCards";
import { LocalGridDetail } from "@/client/features/local-grid/LocalGridDetail";
import { Empty } from "@/client/features/present/PresentBits";
import { PresentQueryGrowth } from "@/client/features/present/PresentQueryGrowth";
import { listCitationChecks } from "@/serverFunctions/citations";
import {
  getDashboardActivation,
  getDashboardOverview,
} from "@/serverFunctions/dashboard";
import { listLocalGrids } from "@/serverFunctions/local-grid";

function Picker<T extends { id: string }>({
  items,
  value,
  label,
  onChange,
}: {
  items: T[];
  value: string;
  label: (item: T) => string;
  onChange: (id: string) => void;
}) {
  if (items.length < 2) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Button
          key={item.id}
          variant={item.id === value ? "secondary" : "outline"}
          onClick={() => onChange(item.id)}
        >
          {label(item)}
        </Button>
      ))}
    </div>
  );
}

export function PresentMap({ projectId }: { projectId: string }) {
  const [gridId, setGridId] = useState<string | undefined>();
  const [runId, setRunId] = useState<string | undefined>();
  const grids = useQuery({
    queryKey: ["localGrids", projectId],
    queryFn: () => listLocalGrids({ data: { projectId } }),
  });
  if (grids.isPending) return <Skeleton className="h-96 w-full rounded-2xl" />;
  const list = grids.data ?? [];
  const grid = list.find((item) => item.id === gridId) ?? list[0];
  if (!grid)
    return <Empty>No map checks have been run for this client yet.</Empty>;

  return (
    <div className="flex flex-col gap-4">
      <Picker
        items={list}
        value={grid.id}
        label={(item) => item.keyword}
        onChange={(id) => {
          setGridId(id);
          setRunId(undefined);
        }}
      />
      <LocalGridDetail
        key={grid.id}
        projectId={projectId}
        gridId={grid.id}
        selectedRunId={runId}
        onSelectRun={setRunId}
        readOnly
      />
    </div>
  );
}

export function PresentListings({ projectId }: { projectId: string }) {
  const [checkId, setCheckId] = useState<string | undefined>();
  const [runId, setRunId] = useState<string | undefined>();
  const checks = useQuery({
    queryKey: ["citationChecks", projectId],
    queryFn: () => listCitationChecks({ data: { projectId } }),
  });
  if (checks.isPending) return <Skeleton className="h-96 w-full rounded-2xl" />;
  const list = checks.data ?? [];
  const check = list.find((item) => item.id === checkId) ?? list[0];
  if (!check) {
    return (
      <Empty>No directory checks have been run for this client yet.</Empty>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Picker
        items={list}
        value={check.id}
        label={(item) => item.businessName}
        onChange={(id) => {
          setCheckId(id);
          setRunId(undefined);
        }}
      />
      <CitationDetail
        key={check.id}
        projectId={projectId}
        checkId={check.id}
        selectedRunId={runId}
        onSelectRun={setRunId}
        readOnly
      />
    </div>
  );
}

/** Per-search growth lines from Search Console, then the site scan. */
export function PresentSearch({
  projectId,
  demo,
}: {
  projectId: string;
  demo: boolean;
}) {
  const activation = useQuery({
    queryKey: ["dashboardActivation", projectId],
    queryFn: () => getDashboardActivation({ data: { projectId } }),
  });
  const overview = useQuery({
    queryKey: ["dashboardOverview", projectId],
    queryFn: () => getDashboardOverview({ data: { projectId } }),
  });
  const audit = overview.data?.audit ?? null;

  return (
    <div className="flex flex-col gap-8">
      <PresentQueryGrowth projectId={projectId} demo={demo} />
      {audit ? (
        <AuditHealthCard
          projectId={projectId}
          audit={audit}
          domain={activation.data?.domain ?? null}
        />
      ) : null}
    </div>
  );
}
