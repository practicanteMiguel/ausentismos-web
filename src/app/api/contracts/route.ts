import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/auth/session";
import { createInvite, inviteUrl } from "@/lib/invites/create";
import { ensureContractFolder } from "@/lib/drive/folders";
import { logAudit } from "@/lib/audit/log";
import { getClientIp } from "@/lib/http/ip";

const bodySchema = z.object({
  number: z.string().min(1).max(40),
  name: z.string().min(2).max(200),
  startDate: z.string().datetime().or(z.string().min(1)),
  endDate: z.string().datetime().or(z.string().min(1)),
});

export async function GET() {
  const user = await requireRole("super-admin");
  void user;
  const snap = await adminDb.collection("contracts").orderBy("createdAt", "desc").get();
  const contracts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return NextResponse.json({ ok: true, data: contracts });
}

export async function POST(request: NextRequest) {
  const user = await requireRole("super-admin");
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Datos inválidos" }, { status: 400 });
  }
  const { number, name, startDate, endDate } = parsed.data;

  const existing = await adminDb.collection("contracts").where("number", "==", number).limit(1).get();
  if (!existing.empty) {
    return NextResponse.json(
      { ok: false, error: "Ya existe un contrato con ese número." },
      { status: 409 }
    );
  }

  const contractRef = adminDb.collection("contracts").doc();
  await contractRef.set({
    number,
    name,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    status: "ACTIVO",
    driveFolderId: null,
    createdAt: FieldValue.serverTimestamp(),
    createdBy: user.uid,
  });

  let driveWarning: string | null = null;
  try {
    const folderId = await ensureContractFolder(number);
    await contractRef.update({ driveFolderId: folderId });
  } catch (error) {
    driveWarning =
      error instanceof Error
        ? `No se pudo crear la carpeta en Drive automáticamente: ${error.message}`
        : "No se pudo crear la carpeta en Drive automáticamente.";
  }

  const token = await createInvite({
    role: "admin",
    contractId: contractRef.id,
    fieldId: null,
    supervisorId: null,
    createdBy: user.uid,
  });

  await logAudit({
    contractId: contractRef.id,
    actorUid: user.uid,
    actorName: user.name,
    action: "CONTRACT_CREATED",
    entityType: "contract",
    entityId: contractRef.id,
    ip: getClientIp(request),
    userAgent: request.headers.get("user-agent"),
    metadata: { number, name },
  });

  return NextResponse.json({
    ok: true,
    data: {
      id: contractRef.id,
      adminInviteUrl: inviteUrl("admin", token),
      driveWarning,
    },
  });
}
