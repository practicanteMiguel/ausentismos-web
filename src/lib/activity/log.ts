import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import type { ActivityType } from "@/types/domain";

interface LogActivityInput {
  contractId: string | null;
  fieldId: string | null;
  targetUserIds: string[];
  actorUid: string;
  actorName: string;
  type: ActivityType;
  title: string;
  description: string;
  relatedEntity: { type: string; id: string } | null;
}

export async function logActivity(input: LogActivityInput): Promise<void> {
  if (input.targetUserIds.length === 0) return;
  await adminDb.collection("activities").add({
    ...input,
    createdAt: FieldValue.serverTimestamp(),
    readBy: {},
  });
}
