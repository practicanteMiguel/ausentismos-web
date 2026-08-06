import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/auth/session";
import { createInvite, inviteUrl } from "@/lib/invites/create";

const bodySchema = z.object({
  role: z.enum(["supervisor", "employee"]),
  fieldId: z.string().min(1).optional(),
});

export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Datos inválidos" }, { status: 400 });
  }
  const { role, fieldId } = parsed.data;

  try {
    if (role === "supervisor") {
      const admin = await requireRole("admin");
      if (!fieldId) {
        return NextResponse.json({ ok: false, error: "fieldId es requerido" }, { status: 400 });
      }
      const fieldSnap = await adminDb.collection("fields").doc(fieldId).get();
      if (!fieldSnap.exists || fieldSnap.data()?.contractId !== admin.contractId) {
        return NextResponse.json({ ok: false, error: "Campo no encontrado" }, { status: 404 });
      }
      const token = await createInvite({
        role: "supervisor",
        contractId: admin.contractId!,
        fieldId,
        supervisorId: null,
        createdBy: admin.uid,
      });
      return NextResponse.json({ ok: true, data: { token, url: inviteUrl("supervisor", token) } });
    }

    // role === "employee": enlace permanente creado por el supervisor
    const supervisor = await requireRole("supervisor");
    const token = await createInvite({
      role: "employee",
      contractId: supervisor.contractId!,
      fieldId: supervisor.fieldId!,
      supervisorId: supervisor.uid,
      createdBy: supervisor.uid,
      permanent: true,
    });
    return NextResponse.json({ ok: true, data: { token, url: inviteUrl("employee", token) } });
  } catch (error) {
    if (error instanceof Error && error.name === "ForbiddenError") {
      return NextResponse.json({ ok: false, error: error.message }, { status: 403 });
    }
    if (error instanceof Error && error.name === "UnauthorizedError") {
      return NextResponse.json({ ok: false, error: error.message }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}
