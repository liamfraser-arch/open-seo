import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui/select";
import { Card } from "@/client/components/ui/card";
import { formatRunDate } from "@/client/features/local-grid/format";
import type { getLocalGrid } from "@/serverFunctions/local-grid";
import { cn } from "cn";

type RunSummary = Awaited<ReturnType<typeof getLocalGrid>>["runs"][number];

function runLabel(run: RunSummary) {
  const date = formatRunDate(run.startedAt);
  if (run.status === "pending") return `${date} · running`;
  if (run.status === "failed") return `${date} · failed`;
  return `${date} · avg ${run.averageRank ?? "—"}`;
}

export function RunPicker({
  runs,
  value,
  onChange,
}: {
  runs: RunSummary[];
  value: string | undefined;
  onChange: (runId: string) => void;
}) {
  const items = runs.map((run) => ({ value: run.id, label: runLabel(run) }));
  return (
    <Select
      items={items}
      value={value ?? null}
      onValueChange={(next) => {
        if (next) onChange(next);
      }}
    >
      <SelectTrigger size="sm" className="w-60" aria-label="Run">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function RunHistory({
  runs,
  selectedRunId,
  onSelect,
}: {
  runs: RunSummary[];
  selectedRunId: string | undefined;
  onSelect: (runId: string) => void;
}) {
  return (
    <Card className="gap-0 py-0">
      <h3 className="border-b px-5 py-3 text-sm font-semibold">History</h3>
      <table className="w-full text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr className="border-b">
            <th className="px-5 py-2 text-left font-normal">Run</th>
            <th className="px-3 py-2 text-right font-normal">Avg rank</th>
            <th className="px-3 py-2 text-right font-normal">Top 3</th>
            <th className="px-5 py-2 text-right font-normal">Found</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {runs.map((run) => (
            <tr
              key={run.id}
              className={cn(
                "cursor-pointer hover:bg-muted/50",
                run.id === selectedRunId && "bg-muted/60",
              )}
              onClick={() => onSelect(run.id)}
            >
              <td className="px-5 py-2">
                <button
                  type="button"
                  className="text-left focus-visible:underline focus-visible:outline-none"
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelect(run.id);
                  }}
                >
                  {formatRunDate(run.startedAt)}
                </button>
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {run.status === "completed"
                  ? (run.averageRank ?? "—")
                  : run.status}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {run.shareOfLocalVoice == null
                  ? "—"
                  : `${run.shareOfLocalVoice}%`}
              </td>
              <td className="px-5 py-2 text-right tabular-nums">
                {run.pointsFound} / {run.pointsTotal}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
