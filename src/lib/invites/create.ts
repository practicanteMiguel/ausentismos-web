import "server-only";
import { randomUUID } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import type { InviteRole } from "@/types/domain";

interface CreateInviteInput {
  role: InviteRole;
  contractId: string;
  fieldId: string | null;
  supervisorId: string | null;
  createdBy: string;
  permanent?: boolean;
}

export async function createInvite(input: CreateInviteInput): Promise<string> {
  const token = randomUUID().replace(/-/g, "");

  await adminDb
    .collection("invites")
    .doc(token)
    .set({
      role: input.role,
      contractId: input.contractId,
      fieldId: input.fieldId,
      supervisorId: input.supervisorId,
      createdBy: input.createdBy,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: null,
      usesRemaining: input.permanent ? null : 1,
      usesCount: 0,
      revoked: false,
    });

  return token;
}

export function inviteUrl(role: InviteRole, token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}/invite/${role}/${token}`;
}
