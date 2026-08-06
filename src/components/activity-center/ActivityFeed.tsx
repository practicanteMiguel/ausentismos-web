"use client";

import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { ACTIVITY_ICON, ACTIVITY_COLOR } from "@/components/activity-center/activity-icons";
import { STAT_COLOR_CLASSES } from "@/components/dashboards/StatCard";
import { cn } from "@/lib/utils";
import type { Activity } from "@/types/domain";

export function ActivityFeed({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Sin actividad reciente.
      </p>
    );
  }

  return (
    <ul className="divide-y">
      {activities.map((activity) => {
        const Icon = ACTIVITY_ICON[activity.type] ?? ACTIVITY_ICON.LEAVE_REQUEST_CREATED;
        const color = ACTIVITY_COLOR[activity.type] ?? "primary";
        const when = activity.createdAt?.toDate ? activity.createdAt.toDate() : new Date();
        return (
          <li key={activity.id} className="flex gap-3 py-3">
            <div
              className={cn(
                "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
                STAT_COLOR_CLASSES[color]
              )}
            >
              <Icon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-tight">{activity.title}</p>
              <p className="text-sm text-muted-foreground">{activity.description}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {activity.actorName} · {formatDistanceToNow(when, { addSuffix: true, locale: es })}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
