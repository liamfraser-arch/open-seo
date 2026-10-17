import { useQueries } from "@tanstack/react-query";
import { Card } from "@/client/components/ui/card";
import { Skeleton } from "@/client/components/ui/skeleton";
import { formatRunDate } from "@/client/features/local-grid/format";
import { RunPicker } from "@/client/features/local-grid/LocalGridHistory";
import {
  LocalGridMap,
  type MapPoint,
} from "@/client/features/local-grid/LocalGridMap";
import {
  Legend,
  Stat,
  delta,
} from "@/client/features/local-grid/LocalGridRunView";
import {
  getLocalGridRun,
  type getLocalGrid,
} from "@/serverFunctions/local-grid";

type RunSummary = Awaited<ReturnType<typeof getLocalGrid>>["runs"][number];

/** Two saved runs of one grid, side by side, with per-point rank changes. */
export function CompareView({
  projectId,
  runs,
  beforeId,
  afterId,
  onChange,
  center,
  apiKey,
  mapId,
}: {
  projectId: string;
  runs: RunSummary[];
  beforeId: string;
  afterId: string;
  onChange: (next: { beforeId: string; afterId: string }) => void;
  center: { latitude: number; longitude: number };
  apiKey: string | null | undefined;
  mapId: string;
}) {
  const [before, after] = useQueries({
    queries: [beforeId, afterId].map((runId) => ({
      queryKey: ["localGridRun", projectId, runId],
      queryFn: () => getLocalGridRun({ data: { projectId, runId } }),
    })),
  });
  // Only finished runs can be compared.
  const finished = runs.filter((run) => run.status === "completed");

  const beforeRun = before.data?.run;
  const afterRun = after.data?.run;
  const beforeRanks = new Map(
    before.data?.points.map((point) => [`${point.row}:${point.col}`, point]),
  );

  const toPoints = (
    detail: NonNullable<typeof before.data>,
    compareWithBefore: boolean,
  ): MapPoint[] =>
    detail.points.map((point) => {
      const earlier = beforeRanks.get(`${point.row}:${point.col}`)?.rank;
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
                    compareWithBefore && point.rank != null && earlier != null
                      ? point.rank - earlier
                      : null,
                },
      };
    });

  return (
    <div className="space-y-4">
      <Card className="flex-row flex-wrap items-center gap-3 px-5 py-3">
        <label className="flex items-center gap-2 text-sm">
          Before
          <RunPicker
            runs={finished}
            value={beforeId}
            onChange={(next) => onChange({ beforeId: next, afterId })}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          After
          <RunPicker
            runs={finished}
            value={afterId}
            onChange={(next) => onChange({ beforeId, afterId: next })}
          />
        </label>
      </Card>

      {!beforeRun || !afterRun || !before.data || !after.data ? (
        <Skeleton className="h-[520px] w-full" />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Average rank"
              hint="Where it ranks, averaged over the points it appears at"
              value={afterRun.averageRank ?? "—"}
              change={delta(afterRun.averageRank, beforeRun.averageRank, true)}
            />
            <Stat
              label="Top 3 share"
              hint="Points where it shows in the Maps 3-pack"
              value={
                afterRun.shareOfLocalVoice == null
                  ? "—"
                  : `${afterRun.shareOfLocalVoice}%`
              }
              change={delta(
                afterRun.shareOfLocalVoice,
                beforeRun.shareOfLocalVoice,
              )}
              suffix="pts"
            />
            <Stat
              label="Top 10"
              hint="Points where it ranks 1–10"
              value={`${afterRun.top10Count} / ${afterRun.pointsSearched}`}
              change={delta(afterRun.top10Count, beforeRun.top10Count)}
            />
            <Stat
              label="Found"
              hint="Points where it appears in the top 20"
              value={`${afterRun.pointsFound} / ${afterRun.pointsSearched}`}
              change={delta(afterRun.pointsFound, beforeRun.pointsFound)}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {[
              { run: beforeRun, detail: before.data, withChange: false },
              { run: afterRun, detail: after.data, withChange: true },
            ].map(({ run, detail, withChange }) => (
              <div key={run.id} className="space-y-2">
                <p className="text-sm font-medium">
                  {withChange ? "After" : "Before"} ·{" "}
                  {formatRunDate(run.startedAt)}
                </p>
                <LocalGridMap
                  key={run.id}
                  apiKey={apiKey}
                  mapId={mapId}
                  points={toPoints(detail, withChange)}
                  gridSize={run.gridSize}
                  center={center}
                  className="h-[420px]"
                />
              </div>
            ))}
          </div>
          <Legend />
          <p className="text-xs text-muted-foreground">
            Pins on the right show how each point moved since{" "}
            {formatRunDate(beforeRun.startedAt)}.
          </p>
        </>
      )}
    </div>
  );
}
