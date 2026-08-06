"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useActivities } from "@/components/activity-center/useActivities";
import { ActivityFeed } from "@/components/activity-center/ActivityFeed";
import { useAuth } from "@/lib/auth/AuthProvider";

export function ActivityBell() {
  const [open, setOpen] = useState(false);
  const { activities, unreadCount } = useActivities();
  const { user } = useAuth();

  async function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next && user) {
      const unread = activities.filter((a) => !a.readBy?.[user.uid]);
      await Promise.all(
        unread.map((a) =>
          updateDoc(doc(db, "activities", a.id), {
            [`readBy.${user.uid}`]: serverTimestamp(),
          }).catch(() => {})
        )
      );
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <Button variant="ghost" size="icon" className="relative" onClick={() => handleOpenChange(true)}>
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <Badge className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full p-0 text-[10px]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </Badge>
        )}
      </Button>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Centro de Actividad</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <ActivityFeed activities={activities} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
