import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/auth/session";
import { downloadFileFromDrive } from "@/lib/drive/folders";
import type { LeaveRequest } from "@/types/domain";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  const user = await requireRole("employee", "supervisor", "admin", "super-admin");
  const { id, fileId } = await params;

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

  const supportFile = (leaveRequest.supportFiles ?? []).find((f) => f.driveFileId === fileId);
  if (!authorized || !supportFile) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }

  let bytes: Buffer;
  try {
    bytes = await downloadFileFromDrive(supportFile.driveFileId);
  } catch {
    return NextResponse.json(
      { ok: false, error: "No se pudo obtener el archivo desde Drive" },
      { status: 502 }
    );
  }

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": supportFile.mimeType,
      "Content-Disposition": `inline; filename="${supportFile.name}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
