import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit/log";
import { getClientIp } from "@/lib/http/ip";

const bodySchema = z.object({ newPassword: z.string().min(8).max(128) });

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const actor = await requireRole("super-admin");
    const { uid } = await params;
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "La contraseña debe tener al menos 8 caracteres." },
        { status: 400 }
      );
    }

    const userSnap = await adminDb.collection("users").doc(uid).get();
    if (!userSnap.exists) {
      return NextResponse.json({ ok: false, error: "Usuario no encontrado" }, { status: 404 });
    }
    const targetUser = userSnap.data() as { contractId: string | null; email: string; name: string };

    await adminAuth.updateUser(uid, { password: parsed.data.newPassword });

    await logAudit({
      contractId: targetUser.contractId,
      actorUid: actor.uid,
      actorName: actor.name,
      action: "PASSWORD_RESET",
      entityType: "user",
      entityId: uid,
      ip: getClientIp(request),
      userAgent: request.headers.get("user-agent"),
      metadata: { targetEmail: targetUser.email, targetName: targetUser.name },
    });

    return NextResponse.json({ ok: true });
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
