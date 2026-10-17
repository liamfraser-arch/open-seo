import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/client/components/ui/button";
import { Card } from "@/client/components/ui/card";

export const selectClass =
  "h-8 rounded-lg border border-input bg-transparent px-2 text-sm";

export function Section({
  title,
  addLabel,
  onAdd,
  children,
}: {
  title: string;
  addLabel: string;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card className="gap-3 px-5 py-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{title}</h2>
        <Button size="sm" variant="outline" onClick={onAdd}>
          <Plus data-icon="inline-start" />
          {addLabel}
        </Button>
      </div>
      {children}
    </Card>
  );
}

export function RemoveButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <Button size="icon-sm" variant="ghost" aria-label={label} onClick={onClick}>
      <Trash2 />
    </Button>
  );
}
