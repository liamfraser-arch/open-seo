import { useQuery } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Circle,
  CircleDot,
} from "lucide-react";
import { QueryError } from "@/client/components/QueryState";
import { SkeletonPage } from "@/client/components/SkeletonPresets";
import { Card } from "@/client/components/ui/card";
import { Progress } from "@/client/components/ui/progress";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/client/components/ui/tabs";
import { PortalProject } from "@/client/features/portal/PortalPage";
import {
  demoContent,
  demoTraffic,
  demoTrend,
} from "@/client/features/portal/portalDemo";
import { Wins } from "@/client/features/portal/PortalWins";
import { PortalTrafficCard } from "@/client/features/portal/PortalTrafficCard";
import { PortalProgressChart } from "@/client/features/portal/PortalProgressChart";
import { getPortalOverview, getPortalTraffic } from "@/serverFunctions/portal";
import {
  positionGain,
  strategyProgress,
  type MilestoneStatus,
  type PortalContent,
} from "@/shared/portal-content";
import type { PortalTraffic } from "@/shared/portal-traffic";
import { cn } from "cn";

export const PORTAL_TABS = [
  "overview",
  "strategy",
  "keywords",
  "grid",
] as const;
export type PortalTab = (typeof PORTAL_TABS)[number];

const TAB_LABELS: Record<PortalTab, string> = {
  overview: "Overview",
  strategy: "Strategy",
  keywords: "Keywords",
  grid: "Local map",
};

export function PortalDashboard({
  projectId,
  tab,
  onTab,
  gridId,
  runId,
  onSelectGrid,
  demo,
}: {
  /** Staff-only sample data; never saved. */
  demo: boolean;
  projectId: string;
  tab: PortalTab;
  onTab: (tab: PortalTab) => void;
  gridId: string | undefined;
  runId: string | undefined;
  onSelectGrid: (next: { gridId: string; runId?: string }) => void;
}) {
  const overviewQuery = useQuery({
    queryKey: ["portalOverview", projectId],
    queryFn: () => getPortalOverview({ data: { projectId } }),
    enabled: !demo,
  });
  const trafficQuery = useQuery({
    queryKey: ["portalTraffic", projectId],
    queryFn: () => getPortalTraffic({ data: { projectId } }),
    enabled: !demo,
    staleTime: 5 * 60_000,
  });

  if (!demo && overviewQuery.isPending) return <SkeletonPage />;
  if (!demo && overviewQuery.isError) {
    return (
      <QueryError
        error={overviewQuery.error}
        fallback="Failed to load your dashboard"
        onRetry={() => void overviewQuery.refetch()}
        isRetrying={overviewQuery.isFetching}
      />
    );
  }
  const content = demo ? demoContent : (overviewQuery.data?.content ?? null);
  const trend = demo ? demoTrend : (overviewQuery.data?.trend ?? []);
  const traffic = demo
    ? demoTraffic
    : trafficQuery.data?.connected
      ? trafficQuery.data
      : null;

  return (
    <Tabs value={tab} onValueChange={(next) => onTab(next as PortalTab)}>
      <TabsList>
        {PORTAL_TABS.map((value) => (
          <TabsTrigger key={value} value={value}>
            {TAB_LABELS[value]}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="overview" className="space-y-4 pt-2">
        {demo ? (
          <p className="rounded-lg bg-amber-100 px-4 py-2 text-sm text-amber-900">
            Sample data. Only you can see this preview; nothing here is saved.
          </p>
        ) : null}
        <Overview content={content} trend={trend} traffic={traffic} />
      </TabsContent>
      <TabsContent value="strategy" className="pt-2">
        {content ? (
          <Strategy content={content} />
        ) : (
          <NotReady what="strategy" />
        )}
      </TabsContent>
      <TabsContent value="keywords" className="pt-2">
        {content && content.clusters.length > 0 ? (
          <Keywords content={content} />
        ) : (
          <NotReady what="keyword groups" />
        )}
      </TabsContent>
      <TabsContent value="grid" className="space-y-4 pt-2">
        <PortalProject
          projectId={projectId}
          gridId={gridId}
          runId={runId}
          onSelect={onSelectGrid}
        />
      </TabsContent>
    </Tabs>
  );
}

function NotReady({ what }: { what: string }) {
  return (
    <Card className="px-5 py-10 text-center text-sm text-muted-foreground">
      Your {what} will appear here soon.
    </Card>
  );
}

function Overview({
  content,
  trend,
  traffic,
}: {
  content: PortalContent | null;
  trend: Parameters<typeof PortalProgressChart>[0]["trend"];
  traffic: PortalTraffic | null;
}) {
  const progress = content ? strategyProgress(content) : null;

  return (
    <>
      {content && progress ? (
        <>
          {content.summary ? (
            <p className="max-w-3xl text-base text-muted-foreground">
              {content.summary}
            </p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="gap-1 px-4 py-3">
              <p className="text-xs text-muted-foreground">Where we are</p>
              <p className="text-2xl font-semibold tabular-nums">
                Month {progress.currentMonth}{" "}
                <span className="text-base font-normal text-muted-foreground">
                  of {progress.monthsTotal}
                </span>
              </p>
            </Card>
            <Card className="gap-2 px-4 py-3">
              <p className="text-xs text-muted-foreground">Plan completed</p>
              <p className="text-2xl font-semibold tabular-nums">
                {progress.percentDone}%
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {progress.milestonesDone} of {progress.milestonesTotal} steps
                </span>
              </p>
              <Progress
                value={progress.percentDone}
                aria-label="Plan completed"
              />
            </Card>
            <Card className="gap-1 px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Milestones reached
              </p>
              <p className="text-2xl font-semibold tabular-nums">
                {content.wins.length}
              </p>
            </Card>
          </div>
        </>
      ) : (
        <NotReady what="plan" />
      )}

      <Wins content={content} traffic={traffic} />
      {traffic ? <PortalTrafficCard traffic={traffic} /> : null}

      <Card className="gap-3 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold">Local visibility over time</h2>
          <p className="text-xs text-muted-foreground">
            Share of your area where you show in Google&rsquo;s top 3 map
            results
          </p>
        </div>
        <PortalProgressChart trend={trend} />
      </Card>
    </>
  );
}

const STATUS: Record<
  MilestoneStatus,
  { label: string; icon: typeof Circle; className: string }
> = {
  done: { label: "Done", icon: CheckCircle2, className: "text-emerald-600" },
  doing: { label: "In progress", icon: CircleDot, className: "text-primary" },
  todo: { label: "Up next", icon: Circle, className: "text-muted-foreground" },
};

function Strategy({ content }: { content: PortalContent }) {
  const { currentMonth } = strategyProgress(content);
  const months = Array.from({ length: 6 }, (_, index) => index + 1);

  return (
    <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
      {months.map((month) => {
        const steps = content.milestones.filter((m) => m.month === month);
        return (
          <Card
            key={month}
            className={cn(
              "content-start gap-3 px-4 py-4",
              month === currentMonth && "ring-2 ring-primary",
            )}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Month {month}</h2>
              {month === currentMonth ? (
                <span className="text-xs font-medium text-primary">Now</span>
              ) : null}
            </div>
            {steps.length === 0 ? (
              <p className="text-sm text-muted-foreground">—</p>
            ) : (
              <ul className="space-y-3">
                {steps.map((step) => {
                  const status = STATUS[step.status];
                  return (
                    <li key={step.title} className="flex gap-2">
                      <status.icon
                        className={cn(
                          "mt-0.5 size-4 shrink-0",
                          status.className,
                        )}
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {step.title}
                          <span className="sr-only"> ({status.label})</span>
                        </p>
                        {step.detail ? (
                          <p className="text-xs text-muted-foreground">
                            {step.detail}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function Keywords({ content }: { content: PortalContent }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {content.clusters.map((cluster) => {
        const onPageOne = cluster.keywords.filter(
          (keyword) =>
            keyword.currentPosition != null && keyword.currentPosition <= 10,
        ).length;
        return (
          <Card key={cluster.name} className="gap-0 py-0">
            <div className="flex items-baseline justify-between gap-3 px-5 pt-4 pb-3">
              <h2 className="text-sm font-semibold">{cluster.name}</h2>
              <p className="text-xs text-muted-foreground">
                {onPageOne} of {cluster.keywords.length} on page 1
              </p>
            </div>
            <table className="w-full border-t border-border text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="px-5 py-2 font-normal">Keyword</th>
                  <th className="px-2 py-2 text-right font-normal">Searches</th>
                  <th className="px-2 py-2 text-right font-normal">Start</th>
                  <th className="px-2 py-2 text-right font-normal">Now</th>
                  <th className="px-5 py-2 text-right font-normal">Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {cluster.keywords.map((keyword) => (
                  <KeywordRow key={keyword.keyword} keyword={keyword} />
                ))}
              </tbody>
            </table>
          </Card>
        );
      })}
    </div>
  );
}

function KeywordRow({
  keyword,
}: {
  keyword: PortalContent["clusters"][number]["keywords"][number];
}) {
  const gain = positionGain(keyword.startPosition, keyword.currentPosition);
  return (
    <tr>
      <td className="px-5 py-2">{keyword.keyword}</td>
      <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">
        {keyword.monthlyVolume?.toLocaleString() ?? "—"}
      </td>
      <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">
        {keyword.startPosition ?? "—"}
      </td>
      <td className="px-2 py-2 text-right font-medium tabular-nums">
        {keyword.currentPosition ?? "—"}
      </td>
      <td className="px-5 py-2 text-right tabular-nums">
        {keyword.startPosition == null && keyword.currentPosition != null ? (
          <span className="font-medium text-emerald-700">New</span>
        ) : gain == null || gain === 0 ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 font-medium",
              gain > 0 ? "text-emerald-700" : "text-red-700",
            )}
          >
            {gain > 0 ? (
              <ArrowUp className="size-3" aria-label="Improved" />
            ) : (
              <ArrowDown className="size-3" aria-label="Dropped" />
            )}
            {Math.abs(gain)}
          </span>
        )}
      </td>
    </tr>
  );
}
