import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Line, LineChart } from "recharts";
import { Badge } from "@/client/components/ui/badge";
import { Skeleton } from "@/client/components/ui/skeleton";
import { SegmentedToggle } from "@/client/components/SegmentedToggle";
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
import { Empty } from "@/client/features/present/PresentBits";
import {
  sampleQueryRows,
  sampleWeeks,
} from "@/client/features/present/sampleSearchGrowth";
import {
  formatDateLabel,
  TIME_AXIS,
} from "@/client/features/rank-tracking/RankTrackingTrendChart";
import {
  getSearchQueryGrowth,
  getTopSearchQueries,
} from "@/serverFunctions/searchGrowth";
import { cn } from "cn";

type Metric = "clicks" | "impressions" | "position";

const METRICS = [
  { value: "clicks", label: "Clicks", icon: null },
  { value: "impressions", label: "Impressions", icon: null },
  { value: "position", label: "Position", icon: null },
] as const;

const METRIC_TEXT: Record<Metric, { title: string; unit: string }> = {
  clicks: {
    title: "People who clicked through to your website",
    unit: "a week",
  },
  impressions: {
    title: "Times your website was shown on Google",
    unit: "a week",
  },
  position: { title: "Where you appear on Google (1 is the top)", unit: "" },
};

const chartConfig: ChartConfig = {
  value: { label: "", color: "var(--chart-1)" },
};

const average = (values: number[]) =>
  values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;

/**
 * Pick a search, see its line: clicks, impressions or position, week by week.
 * Real Search Console data, or marked sample data when `demo` is set.
 */
export function PresentQueryGrowth({
  projectId,
  demo,
}: {
  projectId: string;
  demo: boolean;
}) {
  const [selected, setSelected] = useState<string | undefined>();
  const [metric, setMetric] = useState<Metric>("clicks");

  const top = useQuery({
    queryKey: ["presentTopQueries", projectId, demo],
    queryFn: async () =>
      demo
        ? { connected: true as const, rows: sampleQueryRows() }
        : getTopSearchQueries({ data: { projectId } }),
  });
  const rows = top.data?.connected ? top.data.rows : [];
  const query = selected ?? rows[0]?.key;

  const growth = useQuery({
    queryKey: ["presentQueryGrowth", projectId, query, demo],
    enabled: Boolean(query),
    queryFn: async () =>
      demo
        ? { connected: true as const, weeks: sampleWeeks(query ?? "") }
        : getSearchQueryGrowth({ data: { projectId, query: query ?? "" } }),
  });

  const points = useMemo(
    () =>
      (growth.data?.connected ? growth.data.weeks : []).map((week) => ({
        checkedAt: Date.parse(`${week.weekStart}T00:00:00Z`),
        value:
          metric === "position"
            ? Math.round(week.position * 10) / 10
            : week[metric],
      })),
    [growth.data, metric],
  );

  if (top.isPending) return <Skeleton className="h-[28rem] rounded-2xl" />;
  if (!top.data?.connected) {
    return <Empty>Search Console isn't connected for this client yet.</Empty>;
  }
  if (rows.length === 0) {
    return <Empty>Search Console has no searches for this client yet.</Empty>;
  }

  // Compare the first and last month, so one lucky week doesn't decide it.
  const firstValue = average(points.slice(0, 4).map((point) => point.value));
  const lastValue = average(points.slice(-4).map((point) => point.value));
  const improved =
    metric === "position" ? lastValue < firstValue : lastValue > firstValue;
  const flat = Math.abs(lastValue - firstValue) < 0.05;
  const shown = (value: number) =>
    metric === "position" ? value.toFixed(1) : String(Math.round(value));

  return (
    <div className="flex flex-col gap-4">
      {demo ? (
        <div className="flex items-center gap-2">
          <Badge variant="warning">Sample data</Badge>
          <span className="text-sm text-muted-foreground">
            Made-up numbers for practice. Not this client's real results.
          </span>
        </div>
      ) : null}
      <div className="grid gap-5 lg:grid-cols-[22rem_1fr]">
        <ul className="flex max-h-[34rem] flex-col gap-1 overflow-auto rounded-2xl border border-border bg-card p-2">
          {rows.map((row) => (
            <li key={row.key}>
              <button
                type="button"
                onClick={() => setSelected(row.key)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                  row.key === query
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted",
                )}
              >
                <span className="min-w-0 flex-1 truncate text-base">
                  {row.key}
                </span>
                <span
                  className={cn(
                    "text-sm tabular-nums",
                    row.key === query
                      ? "text-primary-foreground/80"
                      : "text-muted-foreground",
                  )}
                >
                  {row.clicks.toLocaleString()} clicks
                </span>
              </button>
            </li>
          ))}
        </ul>

        <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Searched for</p>
              <h2 className="text-2xl font-semibold tracking-tight">
                “{query}”
              </h2>
            </div>
            <SegmentedToggle
              showLabels
              items={[...METRICS]}
              value={metric}
              onChange={(next) => setMetric(next)}
            />
          </div>
          <p className="text-base text-muted-foreground">
            {METRIC_TEXT[metric].title}
          </p>

          {growth.isPending ? (
            <Skeleton className="h-72 w-full rounded-xl" />
          ) : points.length < 2 ? (
            <p className="py-16 text-center text-muted-foreground">
              Not enough history for this search yet.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <p className="text-5xl font-semibold tracking-tight tabular-nums">
                  {shown(lastValue)}
                  <span className="ml-2 text-lg font-normal text-muted-foreground">
                    {METRIC_TEXT[metric].unit}
                  </span>
                </p>
                <p
                  className={cn(
                    "text-lg font-semibold",
                    flat
                      ? "text-muted-foreground"
                      : improved
                        ? "text-success"
                        : "text-destructive",
                  )}
                >
                  {flat ? "–" : improved ? "▲" : "▼"} from {shown(firstValue)}{" "}
                  <span className="font-normal text-muted-foreground">
                    {Math.round(points.length / 4.345)} months ago
                  </span>
                </p>
              </div>
              <ChartContainer config={chartConfig} className="h-72 w-full">
                <LineChart
                  data={points}
                  margin={{ top: 10, right: 12, bottom: 0, left: 0 }}
                >
                  <ChartGrid />
                  <ChartXAxis {...TIME_AXIS} />
                  <ChartYAxis
                    reversed={metric === "position"}
                    allowDecimals={metric === "position"}
                    domain={metric === "position" ? [1, "auto"] : [0, "auto"]}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={formatDateLabel}
                        valueFormatter={(value) => shown(Number(value))}
                      />
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="var(--color-value)"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                    activeDot={{ r: 6 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ChartContainer>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
