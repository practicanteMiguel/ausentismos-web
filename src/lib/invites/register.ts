import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { logAudit } from "@/lib/audit/log";
import { logActivity } from "@/lib/activity/log";
import type { Invite, InviteRole } from "@/types/domain";

export class InviteError extends Error {}

interface RegisterInput {
  token: string;
  name: string;
  email: string;
  password: string;
  cedula: string | null;
  ip: string | null;
  userAgent: string | null;
}

export async function validateInvite(token: string, expectedRole?: InviteRole): Promise<Invite> {
  const snap = await adminDb.collection("invites").doc(token).get();
  if (!snap.exists) throw new InviteError("El enlace de invitación no existe.");
  const invite = { token: snap.id, ...snap.data() } as Invite;

  if (invite.revoked) throw new InviteError("Este enlace de invitación fue revocado.");
  if (expectedRole && invite.role !== expectedRole) {
    throw new InviteError("Este enlace no corresponde al rol solicitado.");
  }
  if (invite.expiresAt && invite.expiresAt.toDate() < new Date()) {
    throw new InviteError("Este enlace de invitación ha expirado.");
  }
  if (invite.usesRemaining !== null && invite.usesRemaining <= 0) {
    throw new InviteError("Este enlace de invitación ya fue utilizado.");
  }
  return invite;
}

export async function registerFromInvite(input: RegisterInput) {
  const invite = await validateInvite(input.token);

  const userRecord = await adminAuth.createUser({
    email: input.email,
    password: input.password,
    displayName: input.name,
  });

  const claims = {
    role: invite.role,
    contractId: invite.contractId,
    fieldId: invite.fieldId,
    supervisorId: invite.role === "employee" ? invite.supervisorId : null,
  };
  await adminAuth.setCustomUserClaims(userRecord.uid, claims);

  const userDoc = {
    role: invite.role,
    contractId: invite.contractId,
    fieldId: invite.fieldId,
    supervisorId: claims.supervisorId,
    name: input.name,
    email: input.email,
    cedula: input.cedula,
    status: "ACTIVO",
    createdAt: FieldValue.serverTimestamp(),
  };

  const batch = adminDb.batch();
  batch.set(adminDb.collection("users").doc(userRecord.uid), userDoc);

  if (invite.role === "employee") {
    batch.set(adminDb.collection("employees").doc(userRecord.uid), userDoc);
  } else if (invite.role === "supervisor") {
    batch.set(adminDb.collection("supervisors").doc(userRecord.uid), userDoc);
  } else if (invite.role === "admin") {
    batch.set(adminDb.collection("administrators").doc(userRecord.uid), userDoc);
  }

  const inviteRef = adminDb.collection("invites").doc(input.token);
  if (invite.usesRemaining !== null) {
    batch.update(inviteRef, {
      usesRemaining: FieldValue.increment(-1),
      usesCount: FieldValue.increment(1),
    });
  } else {
    batch.update(inviteRef, { usesCount: FieldValue.increment(1) });
  }

  await batch.commit();

  await logAudit({
    contractId: invite.contractId,
    actorUid: userRecord.uid,
    actorName: input.name,
    action: "USER_REGISTERED",
    entityType: "user",
    entityId: userRecord.uid,
    ip: input.ip,
    userAgent: input.userAgent,
    metadata: { role: invite.role },
  });

  // Notifica a quien creó la invitación (admin/supervisor) del nuevo registro.
  await logActivity({
    contractId: invite.contractId,
    fieldId: invite.fieldId,
    targetUserIds: [invite.createdBy],
    actorUid: userRecord.uid,
    actorName: input.name,
    type: "USER_REGISTERED",
    title: `Nuevo ${roleLabel(invite.role)} registrado`,
    description: `${input.name} se registró como ${roleLabel(invite.role)}.`,
    relatedEntity: { type: "user", id: userRecord.uid },
  });

  const customToken = await adminAuth.createCustomToken(userRecord.uid, claims);
  return { customToken, role: invite.role };
}

function roleLabel(role: InviteRole): string {
  return { admin: "administrador", supervisor: "supervisor", employee: "empleado" }[role];
}
