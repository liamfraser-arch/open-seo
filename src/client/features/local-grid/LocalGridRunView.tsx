import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { Card } from "@/client/components/ui/card";
import { Skeleton } from "@/client/components/ui/skeleton";
import { Spinner } from "@/client/components/ui/spinner";
import { formatRunDate } from "@/client/features/local-grid/format";
import {
  GridPin,
  LocalGridMap,
  type MapPoint,
} from "@/client/features/local-grid/LocalGridMap";
import {
  getLocalGridPointResults,
  type getLocalGridRun,
} from "@/serverFunctions/local-grid";
import { cn } from "cn";

type RunDetail = Awaited<ReturnType<typeof getLocalGridRun>>;

export function RunView({
  projectId,
  detail,
  center,
  apiKey,
  mapId,
}: {
  projectId: string;
  detail: RunDetail;
  center: { latitude: number; longitude: number };
  apiKey: string | null | undefined;
  mapId: string;
}) {
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const { run, previous } = detail;

  const points: MapPoint[] = detail.points.map((point, index) => {
    const previousRank = previous?.ranks[index];
    return {
      key: point.id,
      row: point.row,
      col: point.col,
      latitude: point.latitude,
      longitude: point.longitude,
      state:
        point.status === "pending"
          ? { kind: "pending" }
          : point.status === "failed"
            ? { kind: "failed" }
            : {
                kind: "rank",
                rank: point.rank,
                change:
                  point.rank != null && previousRank != null
                    ? point.rank - previousRank
                    : null,
              },
    };
  });
  const selected = detail.points.find((point) => point.id === selectedPointId);

  // Refused before any search was queued: there is nothing to map.
  if (detail.points.length === 0) {
    return (
      <Card className="px-5 py-3 text-sm text-destructive">
        {run.errorMessage ?? "This run failed."}
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {run.status === "pending" ? (
        <Card className="flex-row items-center gap-2 px-5 py-3 text-sm">
          <Spinner />
          {run.pointsTotal - run.pointsPending} of {run.pointsTotal} searches
          back…
        </Card>
      ) : run.status === "failed" ? (
        <Card className="px-5 py-3 text-sm text-destructive">
          {run.errorMessage ?? "This run failed."}
        </Card>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Average rank"
          hint="Where it ranks, averaged over the points it appears at"
          value={run.averageRank ?? "—"}
          change={delta(run.averageRank, previous?.averageRank, true)}
        />
        <Stat
          label="Top 3 share"
          hint="Points where it shows in the Maps 3-pack"
          value={
            run.shareOfLocalVoice == null ? "—" : `${run.shareOfLocalVoice}%`
          }
          change={delta(run.shareOfLocalVoice, previous?.shareOfLocalVoice)}
          suffix="pts"
        />
        <Stat
          label="Top 10"
          hint="Points where it ranks 1–10"
          value={`${run.top10Count} / ${run.pointsSearched}`}
          change={delta(run.top10Count, previous?.top10Count)}
        />
        <Stat
          label="Found"
          hint="Points where it appears in the top 20"
          value={`${run.pointsFound} / ${run.pointsSearched}`}
          change={delta(run.pointsFound, previous?.pointsFound)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-2">
          <LocalGridMap
            key={run.id}
            apiKey={apiKey}
            mapId={mapId}
            points={points}
            gridSize={run.gridSize}
            center={center}
            selectedKey={selectedPointId}
            onSelect={setSelectedPointId}
            className="h-[520px]"
          />
          <Legend />
        </div>
        <Card className="gap-0 py-0">
          {selected ? (
            <PointResults
              projectId={projectId}
              runId={run.id}
              point={selected}
            />
          ) : (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              Click a pin to see who ranks at that point.
            </p>
          )}
        </Card>
      </div>
      {previous ? (
        <p className="text-xs text-muted-foreground">
          Changes compare with the run on {formatRunDate(previous.startedAt)}.
        </p>
      ) : null}
    </div>
  );
}

/** For ranks a fall is good, so `lowerIsBetter` flips the colour. */
export function delta(
  current: number | null | undefined,
  previous: number | null | undefined,
  lowerIsBetter = false,
) {
  if (current == null || previous == null) return null;
  const change = Number((current - previous).toFixed(1));
  if (change === 0) return null;
  return { change, good: lowerIsBetter ? change < 0 : change > 0 };
}

export function Stat({
  label,
  hint,
  value,
  change,
  suffix,
}: {
  label: string;
  hint: string;
  value: string | number;
  change: { change: number; good: boolean } | null;
  suffix?: string;
}) {
  return (
    <Card className="gap-1 px-4 py-3" title={hint}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex items-baseline gap-2">
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        {change ? (
          <span
            className={cn(
              "text-xs font-medium tabular-nums",
              change.good ? "text-emerald-700" : "text-red-700",
            )}
          >
            {change.change > 0 ? "+" : ""}
            {change.change}
            {suffix ? ` ${suffix}` : ""}
          </span>
        ) : null}
      </div>
    </Card>
  );
}

export function Legend() {
  const items = [
    { rank: 1, label: "1–3" },
    { rank: 5, label: "4–10" },
    { rank: 15, label: "11–20" },
    { rank: null, label: "Not in top 20" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <GridPin state={{ kind: "rank", rank: item.rank }} size="sm" />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function PointResults({
  projectId,
  runId,
  point,
}: {
  projectId: string;
  runId: string;
  point: RunDetail["points"][number];
}) {
  const resultsQuery = useQuery({
    queryKey: ["localGridPoint", projectId, runId, point.id],
    queryFn: () =>
      getLocalGridPointResults({
        data: { projectId, runId, pointId: point.id },
      }),
    enabled: point.status === "completed",
    staleTime: Infinity,
  });

  return (
    <div>
      <div className="border-b px-4 py-3">
        <p className="text-sm font-medium">
          {point.status === "completed"
            ? point.rank == null
              ? "Not in the top 20 here"
              : `Ranks #${point.rank} here`
            : point.status === "pending"
              ? "Still searching…"
              : "This search failed"}
        </p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}
        </p>
      </div>
      {resultsQuery.isPending && point.status === "completed" ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-4 w-full" />
          ))}
        </div>
      ) : resultsQuery.data ? (
        <ol className="max-h-[440px] divide-y overflow-auto">
          {resultsQuery.data.map((result) => (
            <li
              key={result.rank}
              className={cn(
                "flex items-start gap-3 px-4 py-2 text-sm",
                result.isTarget && "bg-primary/10",
              )}
            >
              <span className="w-5 shrink-0 text-right text-muted-foreground tabular-nums">
                {result.rank}
              </span>
              <span className="min-w-0 flex-1">
                <ProfileLink result={result} />
                {result.rating != null ? (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="size-3" />
                    {result.rating.toFixed(1)}
                    {result.reviewsCount != null
                      ? ` (${result.reviewsCount})`
                      : ""}
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

/** Opens the business's Google Maps profile; plain text without an id. */
function ProfileLink({
  result,
}: {
  result: {
    title: string | null;
    placeId: string | null;
    cid: string | null;
    isTarget: boolean;
  };
}) {
  const label = result.title ?? "Untitled";
  const className = cn("block truncate", result.isTarget && "font-medium");
  const url = result.placeId
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label)}&query_place_id=${encodeURIComponent(result.placeId)}`
    : result.cid
      ? `https://maps.google.com/?cid=${encodeURIComponent(result.cid)}`
      : null;
  if (!url) return <span className={className}>{label}</span>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      title="Open on Google Maps"
      className={cn(className, "hover:text-primary hover:underline")}
    >
      {label}
    </a>
  );
}
