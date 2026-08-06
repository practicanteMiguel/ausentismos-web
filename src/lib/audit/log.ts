import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import type { AuditAction } from "@/types/domain";

interface LogAuditInput {
  contractId: string | null;
  actorUid: string;
  actorName: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  ip: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown>;
}

export async function logAudit(input: LogAuditInput): Promise<void> {
  await adminDb.collection("auditLogs").add({
    ...input,
    createdAt: FieldValue.serverTimestamp(),
  });
}
