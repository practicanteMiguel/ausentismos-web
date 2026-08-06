import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit/log";
import { logActivity } from "@/lib/activity/log";
import { getClientIp } from "@/lib/http/ip";

const bodySchema = z.object({ name: z.string().min(2).max(120) });

export async function POST(request: NextRequest) {
  const admin = await requireRole("admin");
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Datos inválidos" }, { status: 400 });
  }
  const { name } = parsed.data;

  const existing = await adminDb
    .collection("fields")
    .where("contractId", "==", admin.contractId)
    .where("name", "==", name)
    .limit(1)
    .get();
  if (!existing.empty) {
    return NextResponse.json(
      { ok: false, error: "Ya existe un campo con ese nombre en este contrato." },
      { status: 409 }
    );
  }

  const fieldRef = adminDb.collection("fields").doc();
  await fieldRef.set({
    contractId: admin.contractId,
    name,
    status: "ACTIVO",
    driveFolderId: null,
    createdAt: FieldValue.serverTimestamp(),
    createdBy: admin.uid,
  });

  await logAudit({
    contractId: admin.contractId,
    actorUid: admin.uid,
    actorName: admin.name,
    action: "FIELD_CREATED",
    entityType: "field",
    entityId: fieldRef.id,
    ip: getClientIp(request),
    userAgent: request.headers.get("user-agent"),
    metadata: { name },
  });

  await logActivity({
    contractId: admin.contractId,
    fieldId: fieldRef.id,
    targetUserIds: [admin.uid],
    actorUid: admin.uid,
    actorName: admin.name,
    type: "FIELD_CREATED",
    title: "Campo creado",
    description: `Se creó el campo "${name}".`,
    relatedEntity: { type: "field", id: fieldRef.id },
  });

  return NextResponse.json({ ok: true, data: { id: fieldRef.id } });
}
