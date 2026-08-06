"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useActivities } from "@/components/activity-center/useActivities";
import { ActivityFeed } from "@/components/activity-center/ActivityFeed";

export function RecentActivityWidget() {
  const { activities, loading } = useActivities(8);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Actividad reciente</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando...</p>
        ) : (
          <ActivityFeed activities={activities} />
        )}
      </CardContent>
    </Card>
  );
}
