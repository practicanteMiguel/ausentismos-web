import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/auth/session";
import { createInvite, inviteUrl } from "@/lib/invites/create";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("super-admin");
  const { id } = await params;

  const contractSnap = await adminDb.collection("contracts").doc(id).get();
  if (!contractSnap.exists) {
    return NextResponse.json({ ok: false, error: "Contrato no encontrado" }, { status: 404 });
  }

  const token = await createInvite({
    role: "admin",
    contractId: id,
    fieldId: null,
    supervisorId: null,
    createdBy: user.uid,
  });

  return NextResponse.json({ ok: true, data: { url: inviteUrl("admin", token) } });
}
