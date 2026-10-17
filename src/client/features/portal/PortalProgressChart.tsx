import { Line, LineChart } from "recharts";
import { sort } from "remeda";
import {
  ChartGrid,
  ChartXAxis,
  ChartYAxis,
} from "@/client/components/ChartAxes";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/client/components/ui/chart";
import type { getPortalOverview } from "@/serverFunctions/portal";

type Trend = Awaited<ReturnType<typeof getPortalOverview>>["trend"];

// Fixed order, one hue per grid, never cycled. A lone grid wears the brand.
const MAX_LINES = 5;
const SERIES_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const shortDate = (value: string | number) =>
  new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

const runTime = (iso: string) => Date.parse(iso);

/**
 * Share of the area where the business shows in Google's top 3 map results,
 * report by report. One line per tracked keyword.
 */
export function PortalProgressChart({ trend }: { trend: Trend }) {
  const lines = trend
    .filter((grid) => grid.points.some((point) => point.top3Share != null))
    .slice(0, MAX_LINES);
  const reports = new Set(
    lines.flatMap((grid) => grid.points.map((point) => runTime(point.date))),
  );

  if (reports.size < 2) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Your progress chart appears after your second report.
      </p>
    );
  }

  const config: ChartConfig = Object.fromEntries(
    lines.map((grid, index) => [
      `g${index}`,
      {
        label: grid.keyword,
        color: lines.length === 1 ? "var(--primary)" : SERIES_COLORS[index],
      },
    ]),
  );
  const data = sort([...reports], (a, b) => a - b).map((time) => ({
    time,
    ...Object.fromEntries(
      lines.map((grid, index) => [
        `g${index}`,
        grid.points.find((point) => runTime(point.date) === time)?.top3Share ??
          null,
      ]),
    ),
  }));

  return (
    <ChartContainer
      config={config}
      className="h-[280px]"
      aria-label="Share of your area where you show in the top 3 on Google Maps, over time"
    >
      <LineChart data={data} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
        <ChartGrid />
        <ChartXAxis
          dataKey="time"
          type="number"
          scale="time"
          domain={["dataMin", "dataMax"]}
          tickFormatter={shortDate}
        />
        <ChartYAxis
          domain={[0, 100]}
          ticks={[0, 25, 50, 75, 100]}
          tickFormatter={(value: number) => `${value}%`}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(label) => shortDate(Number(label))}
              valueFormatter={(value) => `${String(value)}%`}
            />
          }
        />
        {lines.length > 1 ? (
          <ChartLegend content={<ChartLegendContent />} />
        ) : null}
        {lines.map((grid, index) => (
          <Line
            key={grid.gridId}
            type="monotone"
            dataKey={`g${index}`}
            stroke={`var(--color-g${index})`}
            strokeWidth={2}
            dot={{ r: 4, strokeWidth: 2 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ChartContainer>
  );
}
