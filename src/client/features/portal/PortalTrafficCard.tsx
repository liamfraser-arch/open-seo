import { useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Bar, BarChart } from "recharts";
import {
  ChartGrid,
  ChartXAxis,
  ChartYAxis,
} from "@/client/components/ChartAxes";
import { Button } from "@/client/components/ui/button";
import { Card } from "@/client/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/client/components/ui/chart";
import {
  percentChange,
  type PortalTraffic,
  type TrafficPeriod,
} from "@/shared/portal-traffic";
import { cn } from "cn";

const chartConfig: ChartConfig = {
  clicks: { label: "Clicks from Google", color: "var(--primary)" },
};

const monthLabel = (month: string) =>
  new Date(`${month}-01T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    timeZone: "UTC",
  });

function Change({ current, previous }: { current: number; previous: number }) {
  const change = percentChange(current, previous);
  if (change == null || change === 0) return null;
  const up = change > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-sm font-medium",
        up ? "text-emerald-700" : "text-red-700",
      )}
    >
      {up ? (
        <ArrowUp className="size-3.5" aria-label="Up" />
      ) : (
        <ArrowDown className="size-3.5" aria-label="Down" />
      )}
      {Math.abs(change)}%
    </span>
  );
}

function Figure({
  label,
  value,
  previous,
}: {
  label: string;
  value: number;
  previous: number;
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="flex items-baseline gap-2 text-2xl font-semibold tabular-nums">
        {value.toLocaleString()}
        <Change current={value} previous={previous} />
      </p>
      <p className="text-xs text-muted-foreground tabular-nums">
        was {previous.toLocaleString()}
      </p>
    </div>
  );
}

/** Clicks and impressions from Google, now against an earlier period. */
export function PortalTrafficCard({ traffic }: { traffic: PortalTraffic }) {
  const [mode, setMode] = useState<"quarter" | "year">("quarter");
  const period: TrafficPeriod =
    mode === "year" && traffic.yearOnYear
      ? traffic.yearOnYear
      : traffic.threeMonths;

  return (
    <Card className="gap-4 px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Visitors from Google</h2>
          <p className="text-xs text-muted-foreground">
            The last 3 months compared with{" "}
            {mode === "year"
              ? "the same months last year"
              : "the 3 months before"}
          </p>
        </div>
        {traffic.yearOnYear ? (
          <div className="flex gap-1" role="group" aria-label="Compare with">
            <Button
              size="sm"
              variant={mode === "quarter" ? "default" : "outline"}
              onClick={() => setMode("quarter")}
            >
              Previous 3 months
            </Button>
            <Button
              size="sm"
              variant={mode === "year" ? "default" : "outline"}
              onClick={() => setMode("year")}
            >
              Last year
            </Button>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Figure
          label="Clicks to the website"
          value={period.clicks}
          previous={period.prevClicks}
        />
        <Figure
          label="Times shown on Google"
          value={period.impressions}
          previous={period.prevImpressions}
        />
      </div>

      <ChartContainer
        config={chartConfig}
        className="h-[200px]"
        aria-label="Clicks from Google by month"
      >
        <BarChart
          data={traffic.monthly}
          margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
        >
          <ChartGrid />
          <ChartXAxis dataKey="month" tickFormatter={monthLabel} />
          <ChartYAxis />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(label) => monthLabel(String(label))}
              />
            }
          />
          <Bar
            dataKey="clicks"
            fill="var(--color-clicks)"
            radius={[4, 4, 0, 0]}
            maxBarSize={36}
          />
        </BarChart>
      </ChartContainer>
    </Card>
  );
}
