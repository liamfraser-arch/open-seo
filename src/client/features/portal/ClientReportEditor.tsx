import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { QueryError } from "@/client/components/QueryState";
import { SkeletonPage } from "@/client/components/SkeletonPresets";
import { Button } from "@/client/components/ui/button";
import { Card } from "@/client/components/ui/card";
import { Input } from "@/client/components/ui/input";
import {
  RemoveButton,
  Section,
  selectClass,
} from "@/client/features/portal/EditorParts";
import { getPortalOverview, savePortalContent } from "@/serverFunctions/portal";
import {
  MILESTONE_STATUSES,
  PORTAL_STRATEGY_MONTHS,
  type MilestoneStatus,
  type PortalContent,
} from "@/shared/portal-content";

const today = () => new Date().toISOString().slice(0, 10);

const emptyContent = (): PortalContent => ({
  startDate: today(),
  summary: "",
  milestones: [],
  clusters: [],
  wins: [],
});

const STATUS_LABELS: Record<MilestoneStatus, string> = {
  todo: "Up next",
  doing: "In progress",
  done: "Done",
};

const toNumber = (value: string) => (value === "" ? null : Number(value));

/** Edit what a client sees on their dashboard. Saves everything at once. */
export function ClientReportEditor({ projectId }: { projectId: string }) {
  const overviewQuery = useQuery({
    queryKey: ["portalOverview", projectId],
    queryFn: () => getPortalOverview({ data: { projectId } }),
  });

  if (overviewQuery.isPending) return <SkeletonPage />;
  if (overviewQuery.isError) {
    return (
      <QueryError
        error={overviewQuery.error}
        fallback="Failed to load the client report"
        onRetry={() => void overviewQuery.refetch()}
        isRetrying={overviewQuery.isFetching}
      />
    );
  }
  return (
    <EditorForm
      projectId={projectId}
      initial={overviewQuery.data.content ?? emptyContent()}
    />
  );
}

function EditorForm({
  projectId,
  initial,
}: {
  projectId: string;
  initial: PortalContent;
}) {
  const queryClient = useQueryClient();
  const [content, setContent] = useState(initial);
  const patch = (next: Partial<PortalContent>) =>
    setContent((current) => ({ ...current, ...next }));

  const saveMutation = useMutation({
    mutationFn: () => savePortalContent({ data: { projectId, ...content } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["portalOverview", projectId],
      });
      toast.success("Client report saved");
    },
  });

  const setMilestone = (
    index: number,
    next: Partial<PortalContent["milestones"][number]>,
  ) =>
    patch({
      milestones: content.milestones.map((m, i) =>
        i === index ? { ...m, ...next } : m,
      ),
    });
  const setCluster = (
    index: number,
    next: Partial<PortalContent["clusters"][number]>,
  ) =>
    patch({
      clusters: content.clusters.map((c, i) =>
        i === index ? { ...c, ...next } : c,
      ),
    });
  const setKeyword = (
    clusterIndex: number,
    keywordIndex: number,
    next: Partial<PortalContent["clusters"][number]["keywords"][number]>,
  ) =>
    setCluster(clusterIndex, {
      keywords: content.clusters[clusterIndex].keywords.map((k, i) =>
        i === keywordIndex ? { ...k, ...next } : k,
      ),
    });
  const setWin = (
    index: number,
    next: Partial<PortalContent["wins"][number]>,
  ) =>
    patch({
      wins: content.wins.map((w, i) => (i === index ? { ...w, ...next } : w)),
    });

  return (
    <div className="space-y-6">
      <Card className="gap-3 px-5 py-4">
        <h2 className="text-sm font-semibold">The plan</h2>
        <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
          <label className="space-y-1 text-xs text-muted-foreground">
            Start date
            <Input
              type="date"
              value={content.startDate}
              onChange={(event) => patch({ startDate: event.target.value })}
            />
          </label>
          <label className="space-y-1 text-xs text-muted-foreground">
            One-line summary for the client
            <Input
              value={content.summary}
              maxLength={400}
              placeholder="Get Cold Factor into the top 3 for emergency AC repair across Dallas–Fort Worth."
              onChange={(event) => patch({ summary: event.target.value })}
            />
          </label>
        </div>
      </Card>

      <Section
        title="6-month strategy"
        onAdd={() =>
          patch({
            milestones: [
              ...content.milestones,
              { month: 1, title: "", detail: "", status: "todo" },
            ],
          })
        }
        addLabel="Add step"
      >
        {content.milestones.map((milestone, index) => (
          <div
            key={index}
            className="grid gap-2 sm:grid-cols-[110px_1fr_1.4fr_130px_auto]"
          >
            <select
              aria-label="Month"
              className={selectClass}
              value={milestone.month}
              onChange={(event) =>
                setMilestone(index, { month: Number(event.target.value) })
              }
            >
              {Array.from({ length: PORTAL_STRATEGY_MONTHS }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  Month {i + 1}
                </option>
              ))}
            </select>
            <Input
              aria-label="Step"
              placeholder="Step"
              value={milestone.title}
              onChange={(event) =>
                setMilestone(index, { title: event.target.value })
              }
            />
            <Input
              aria-label="Detail"
              placeholder="Detail (optional)"
              value={milestone.detail}
              onChange={(event) =>
                setMilestone(index, { detail: event.target.value })
              }
            />
            <select
              aria-label="Status"
              className={selectClass}
              value={milestone.status}
              onChange={(event) =>
                setMilestone(index, {
                  status: MILESTONE_STATUSES.find(
                    (status) => status === event.target.value,
                  ),
                })
              }
            >
              {MILESTONE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
            <RemoveButton
              label="Remove step"
              onClick={() =>
                patch({
                  milestones: content.milestones.filter((_, i) => i !== index),
                })
              }
            />
          </div>
        ))}
      </Section>

      <Section
        title="Keyword groups"
        onAdd={() =>
          patch({
            clusters: [...content.clusters, { name: "", keywords: [] }],
          })
        }
        addLabel="Add group"
      >
        {content.clusters.map((cluster, clusterIndex) => (
          <div key={clusterIndex} className="space-y-2 rounded-lg border p-3">
            <div className="flex gap-2">
              <Input
                aria-label="Group name"
                placeholder="Group name, for example Emergency repair"
                value={cluster.name}
                onChange={(event) =>
                  setCluster(clusterIndex, { name: event.target.value })
                }
              />
              <RemoveButton
                label="Remove group"
                onClick={() =>
                  patch({
                    clusters: content.clusters.filter(
                      (_, i) => i !== clusterIndex,
                    ),
                  })
                }
              />
            </div>
            {cluster.keywords.map((keyword, keywordIndex) => (
              <div
                key={keywordIndex}
                className="grid gap-2 sm:grid-cols-[1fr_100px_80px_80px_auto]"
              >
                <Input
                  aria-label="Keyword"
                  placeholder="Keyword"
                  value={keyword.keyword}
                  onChange={(event) =>
                    setKeyword(clusterIndex, keywordIndex, {
                      keyword: event.target.value,
                    })
                  }
                />
                {(
                  [
                    ["monthlyVolume", "Searches / mo"],
                    ["startPosition", "Start rank"],
                    ["currentPosition", "Rank now"],
                  ] as const
                ).map(([field, label]) => (
                  <Input
                    key={field}
                    type="number"
                    min={0}
                    aria-label={label}
                    placeholder={label}
                    value={keyword[field] ?? ""}
                    onChange={(event) =>
                      setKeyword(clusterIndex, keywordIndex, {
                        [field]: toNumber(event.target.value),
                      })
                    }
                  />
                ))}
                <RemoveButton
                  label="Remove keyword"
                  onClick={() =>
                    setCluster(clusterIndex, {
                      keywords: cluster.keywords.filter(
                        (_, i) => i !== keywordIndex,
                      ),
                    })
                  }
                />
              </div>
            ))}
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setCluster(clusterIndex, {
                  keywords: [
                    ...cluster.keywords,
                    {
                      keyword: "",
                      monthlyVolume: null,
                      startPosition: null,
                      currentPosition: null,
                    },
                  ],
                })
              }
            >
              <Plus data-icon="inline-start" />
              Add keyword
            </Button>
          </div>
        ))}
      </Section>

      <Section
        title="Wins"
        onAdd={() =>
          patch({
            wins: [{ title: "", detail: "", wonOn: today() }, ...content.wins],
          })
        }
        addLabel="Add win"
      >
        {content.wins.map((win, index) => (
          <div
            key={index}
            className="grid gap-2 sm:grid-cols-[150px_1fr_1.4fr_auto]"
          >
            <Input
              type="date"
              aria-label="Date"
              value={win.wonOn}
              onChange={(event) => setWin(index, { wonOn: event.target.value })}
            />
            <Input
              aria-label="Win"
              placeholder="Win"
              value={win.title}
              onChange={(event) => setWin(index, { title: event.target.value })}
            />
            <Input
              aria-label="Detail"
              placeholder="Detail (optional)"
              value={win.detail}
              onChange={(event) =>
                setWin(index, { detail: event.target.value })
              }
            />
            <RemoveButton
              label="Remove win"
              onClick={() =>
                patch({ wins: content.wins.filter((_, i) => i !== index) })
              }
            />
          </div>
        ))}
      </Section>

      <div className="sticky bottom-4 flex justify-end">
        <Button
          disabled={saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          Save client report
        </Button>
      </div>
    </div>
  );
}
