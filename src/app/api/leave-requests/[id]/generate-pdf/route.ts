import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/auth/session";
import { generateAndArchivePdf } from "@/lib/leaveRequests/generatePdf";
import type { LeaveRequest } from "@/types/domain";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("admin", "supervisor", "super-admin");
  const { id } = await params;

  const snap = await adminDb.collection("leaveRequests").doc(id).get();
  if (!snap.exists) {
    return NextResponse.json({ ok: false, error: "Solicitud no encontrada" }, { status: 404 });
  }
  const leaveRequest = snap.data() as LeaveRequest;
  if (user.role !== "super-admin" && leaveRequest.contractId !== user.contractId) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }
  if (leaveRequest.status !== "APROBADO" && leaveRequest.status !== "PDF_GENERADO") {
    return NextResponse.json(
      { ok: false, error: "La solicitud debe estar aprobada para generar el PDF." },
      { status: 409 }
    );
  }

  try {
    await generateAndArchivePdf(id);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Error generando el PDF" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
