import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Line, LineChart } from "recharts";
import { sort } from "remeda";
import { Skeleton } from "@/client/components/ui/skeleton";
import {
  ChartGrid,
  ChartXAxis,
  ChartYAxis,
} from "@/client/components/ChartAxes";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/client/components/ui/chart";
import { useRankings } from "@/client/features/present/PresentRankings";
import {
  formatDateLabel,
  TIME_AXIS,
} from "@/client/features/rank-tracking/RankTrackingTrendChart";
import {
  getCitationCheck,
  listCitationChecks,
} from "@/serverFunctions/citations";
import { getLocalGrid, listLocalGrids } from "@/serverFunctions/local-grid";
import { getRankConfigTrend } from "@/serverFunctions/rank-tracking";
import { cn } from "cn";

type Point = { checkedAt: number; value: number };

const byTime = (points: Point[]) =>
  sort(points, (a, b) => a.checkedAt - b.checkedAt);

/** Timestamps from the database lack a zone; they are UTC. */
function toMs(iso: string) {
  return Date.parse(
    /[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso.replace(" ", "T")}Z`,
  );
}

const chartConfig: ChartConfig = {
  value: { label: "", color: "var(--chart-1)" },
};

/** One result as a line over time, headed by how far it has moved. */
function TrendCard({
  question,
  unit,
  points,
  empty,
}: {
  question: string;
  /** Suffix for each value: "%" or a noun. */
  unit: string;
  points: Point[];
  empty: string;
}) {
  const first = points[0];
  const last = points.at(-1);
  const change = first && last ? last.value - first.value : 0;
  const format = (value: number) => `${Math.round(value * 10) / 10}${unit}`;

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6">
      <h2 className="text-lg font-medium">{question}</h2>
      {!first || !last ? (
        <p className="py-10 text-center text-muted-foreground">{empty}</p>
      ) : (
        <>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <p className="text-5xl font-semibold tracking-tight tabular-nums">
              {format(last.value)}
            </p>
            {points.length > 1 ? (
              <p
                className={cn(
                  "text-lg font-semibold",
                  change > 0
                    ? "text-success"
                    : change < 0
                      ? "text-destructive"
                      : "text-muted-foreground",
                )}
              >
                {change > 0 ? "▲" : change < 0 ? "▼" : "–"}{" "}
                {format(Math.abs(change))}{" "}
                <span className="font-normal text-muted-foreground">
                  since{" "}
                  {new Date(first.checkedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  (was {format(first.value)})
                </span>
              </p>
            ) : (
              <p className="text-muted-foreground">
                First measurement. The line grows with every check.
              </p>
            )}
          </div>
          <ChartContainer config={chartConfig} className="h-56 w-full">
            <LineChart
              data={points}
              margin={{ top: 10, right: 12, bottom: 0, left: 0 }}
            >
              <ChartGrid />
              <ChartXAxis {...TIME_AXIS} />
              <ChartYAxis allowDecimals={false} domain={[0, "auto"]} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={formatDateLabel}
                    valueFormatter={(value) => format(Number(value))}
                  />
                }
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--color-value)"
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ChartContainer>
        </>
      )}
    </section>
  );
}

/** The grid or check whose history has the most finished runs. */
function longest<T extends { points: Point[] }>(items: T[]) {
  return items.reduce<T | null>(
    (best, item) =>
      !best || item.points.length > best.points.length ? item : best,
    null,
  );
}

function MapTrend({ projectId }: { projectId: string }) {
  const grids = useQuery({
    queryKey: ["localGrids", projectId],
    queryFn: () => listLocalGrids({ data: { projectId } }),
  });
  const details = useQueries({
    queries: (grids.data ?? []).map((grid) => ({
      queryKey: ["localGrid", projectId, grid.id],
      queryFn: () => getLocalGrid({ data: { projectId, gridId: grid.id } }),
    })),
  });
  const best = longest(
    details.flatMap((detail) =>
      detail.data
        ? [
            {
              keyword: detail.data.grid.keyword,
              points: byTime(
                detail.data.runs
                  .filter(
                    (run) =>
                      run.status === "completed" &&
                      run.shareOfLocalVoice !== null,
                  )
                  .map((run) => ({
                    checkedAt: toMs(run.startedAt),
                    value: run.shareOfLocalVoice ?? 0,
                  })),
              ),
            },
          ]
        : [],
    ),
  );
  if (grids.isPending || details.some((detail) => detail.isPending)) {
    return <Skeleton className="h-96 rounded-2xl" />;
  }
  return (
    <TrendCard
      question={
        best
          ? `Share of your area where you're a top 3 result on Google Maps (“${best.keyword}”)`
          : "Share of your area where you're a top 3 result on Google Maps"
      }
      unit="%"
      points={best?.points ?? []}
      empty="Run a map check to start this line."
    />
  );
}

function RankTrend({ projectId }: { projectId: string }) {
  const { config, isPending } = useRankings(projectId);
  const device = config?.devices === "desktop" ? "desktop" : "mobile";
  const trend = useQuery({
    queryKey: ["presentRankTrend", projectId, config?.id, device],
    queryFn: () =>
      getRankConfigTrend({
        data: {
          projectId,
          configId: config?.id ?? "",
          device,
          sinceDays: 365,
        },
      }),
    enabled: Boolean(config),
  });
  const points = useMemo(
    () =>
      (trend.data ?? []).map((row) => ({
        checkedAt: toMs(row.checkedAt),
        value: row.top3 + row.top4to10,
      })),
    [trend.data],
  );
  if (isPending || (config && trend.isPending)) {
    return <Skeleton className="h-96 rounded-2xl" />;
  }
  return (
    <TrendCard
      question="Searches where you're on page 1 of Google"
      unit=""
      points={points}
      empty="Run a rank check to start this line."
    />
  );
}

function ListingsTrend({ projectId }: { projectId: string }) {
  const checks = useQuery({
    queryKey: ["citationChecks", projectId],
    queryFn: () => listCitationChecks({ data: { projectId } }),
  });
  const details = useQueries({
    queries: (checks.data ?? []).map((check) => ({
      queryKey: ["citationCheck", projectId, check.id],
      queryFn: () =>
        getCitationCheck({ data: { projectId, checkId: check.id } }),
    })),
  });
  const best = longest(
    details.flatMap((detail) =>
      detail.data
        ? [
            {
              points: byTime(
                detail.data.runs
                  .filter((run) => run.status === "completed")
                  .map((run) => ({
                    checkedAt: toMs(run.startedAt),
                    value: run.found,
                  })),
              ),
            },
          ]
        : [],
    ),
  );
  if (checks.isPending || details.some((detail) => detail.isPending)) {
    return <Skeleton className="h-96 rounded-2xl" />;
  }
  return (
    <TrendCard
      question="Directories that list your business"
      unit=""
      points={best?.points ?? []}
      empty="Run a directory check to start this line."
    />
  );
}

/** The wins over time: each result as a line, newest on the right. */
export function PresentProgress({ projectId }: { projectId: string }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <MapTrend projectId={projectId} />
      <RankTrend projectId={projectId} />
      <ListingsTrend projectId={projectId} />
      <p className="self-center text-base text-muted-foreground lg:px-6">
        Each point is one check. Lines move up as the work takes effect, and
        every future check adds a point.
      </p>
    </div>
  );
}
