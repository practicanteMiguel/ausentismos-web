import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/auth/session";

const patchSchema = z.object({
  status: z.enum(["ACTIVO", "VENCIDO", "SUSPENDIDO"]),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole("super-admin");
  const { id } = await params;
  const snap = await adminDb.collection("contracts").doc(id).get();
  if (!snap.exists) {
    return NextResponse.json({ ok: false, error: "Contrato no encontrado" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, data: { id: snap.id, ...snap.data() } });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole("super-admin");
  const { id } = await params;
  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Datos inválidos" }, { status: 400 });
  }
  await adminDb.collection("contracts").doc(id).update({ status: parsed.data.status });
  return NextResponse.json({ ok: true });
}
