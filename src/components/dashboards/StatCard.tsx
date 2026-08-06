import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export type StatColor = "primary" | "info" | "success" | "warning" | "violet" | "destructive";

export const STAT_COLOR_CLASSES: Record<StatColor, string> = {
  primary: "bg-primary/10 text-primary",
  info: "bg-info/10 text-info",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  violet: "bg-[var(--chart-3)]/10 text-[var(--chart-3)]",
  destructive: "bg-destructive/10 text-destructive",
};

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  color?: StatColor;
}

export function StatCard({ label, value, icon: Icon, color = "primary" }: StatCardProps) {
  return (
    <Card className="gap-0 py-0">
      <CardContent className="flex items-center gap-3.5 p-4">
        <div
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl",
            STAT_COLOR_CLASSES[color]
          )}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
