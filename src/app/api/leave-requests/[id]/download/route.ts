import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit/log";
import { getClientIp } from "@/lib/http/ip";
import { downloadPdfFromDrive } from "@/lib/drive/folders";
import type { LeaveRequest } from "@/types/domain";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireRole("employee", "supervisor", "admin", "super-admin");
  const { id } = await params;

  const snap = await adminDb.collection("leaveRequests").doc(id).get();
  if (!snap.exists) {
    return NextResponse.json({ ok: false, error: "Solicitud no encontrada" }, { status: 404 });
  }
  const leaveRequest = snap.data() as LeaveRequest;

  const authorized =
    user.role === "super-admin" ||
    (user.role === "admin" && leaveRequest.contractId === user.contractId) ||
    (user.role === "supervisor" && leaveRequest.supervisorId === user.uid) ||
    (user.role === "employee" && leaveRequest.employeeId === user.uid);
  if (!authorized || !leaveRequest.pdf) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }

  let pdfBytes: Buffer;
  try {
    pdfBytes = await downloadPdfFromDrive(leaveRequest.pdf.driveFileId);
  } catch {
    return NextResponse.json(
      { ok: false, error: "No se pudo obtener el PDF desde Drive" },
      { status: 502 }
    );
  }

  await logAudit({
    contractId: leaveRequest.contractId,
    actorUid: user.uid,
    actorName: user.name,
    action: "PDF_DOWNLOADED",
    entityType: "leaveRequest",
    entityId: id,
    ip: getClientIp(request),
    userAgent: request.headers.get("user-agent"),
    metadata: {},
  });

  const fileName = `${leaveRequest.employeeCedula}_${leaveRequest.employeeName.replace(/\s+/g, "_")}.pdf`;

  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
