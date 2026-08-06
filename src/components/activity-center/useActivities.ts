"use client";

import { useEffect, useState } from "react";
import { onSnapshot, orderBy, query, where, limit as fbLimit } from "firebase/firestore";
import { activitiesCol } from "@/lib/firestore/collections";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { Activity } from "@/types/domain";

export function useActivities(pageSize = 20) {
  const { user, loading: authLoading } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [snapshotLoading, setSnapshotLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      activitiesCol,
      where("targetUserIds", "array-contains", user.uid),
      orderBy("createdAt", "desc"),
      fbLimit(pageSize)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setActivities(snapshot.docs.map((d) => d.data()));
      setSnapshotLoading(false);
    });
    return unsubscribe;
  }, [user, pageSize]);

  const effectiveActivities = user ? activities : [];
  const loading = authLoading || (Boolean(user) && snapshotLoading);
  const unreadCount = user
    ? effectiveActivities.filter((a) => !a.readBy?.[user.uid]).length
    : 0;

  return { activities: effectiveActivities, loading, unreadCount };
}
