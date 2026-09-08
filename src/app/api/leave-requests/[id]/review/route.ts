import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit/log";
import { logActivity } from "@/lib/activity/log";
import { getClientIp } from "@/lib/http/ip";
import { generateAndArchivePdf } from "@/lib/leaveRequests/generatePdf";
import { deleteDriveFile, deleteEmployeeFolderIfEmpty } from "@/lib/drive/folders";
import type { Contract, FieldDoc, LeaveRequest, LeaveRequestHistoryEntry } from "@/types/domain";

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("approve"),
    supervisorPosition: z.string().trim().min(2).max(120),
    supervisorSignatureDataUrl: z.string().startsWith("data:image/png;base64,"),
  }),
  z.object({ action: z.literal("reject"), rejectionReason: z.string().min(3).max(500) }),
]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supervisor = await requireRole("supervisor");
  const { id } = await params;
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Datos inválidos" }, { status: 400 });
  }

  const requestRef = adminDb.collection("leaveRequests").doc(id);
  const snap = await requestRef.get();
  if (!snap.exists) {
    return NextResponse.json({ ok: false, error: "Solicitud no encontrada" }, { status: 404 });
  }
  const leaveRequest = { id: snap.id, ...snap.data() } as LeaveRequest;

  if (leaveRequest.supervisorId !== supervisor.uid) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }
  if (leaveRequest.status !== "PENDIENTE_SUPERVISOR") {
    return NextResponse.json(
      { ok: false, error: "Esta solicitud ya fue procesada." },
      { status: 409 }
    );
  }

  const now = Timestamp.now();

  if (parsed.data.action === "reject") {
    // Los documentos de soporte se subieron a Drive al crear la solicitud; si se rechaza, no debe
    // quedar nada archivado — se eliminan de Drive (best-effort) y se vacía la referencia.
    // ?? [] por compatibilidad con solicitudes creadas antes de este campo.
    const supportFiles = leaveRequest.supportFiles ?? [];
    let deletionWarning: string | null = null;
    if (supportFiles.length > 0) {
      const results = await Promise.allSettled(
        supportFiles.map((file) => deleteDriveFile(file.driveFileId))
      );
      const failures = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
      if (failures.length > 0) {
        // No bloquea el rechazo (el estado ya cambió es lo importante), pero se registra para
        // poder diagnosticar y reintentar manualmente si Drive falló (permisos, cuota, etc.).
        console.error(
          `No se pudieron eliminar ${failures.length}/${supportFiles.length} documentos de soporte de la solicitud ${id}:`,
          failures.map((f) => f.reason)
        );
        deletionWarning =
          "Rechazado, pero no se pudieron eliminar todos los documentos de soporte de Drive.";
      } else {
        // Si esta solicitud dejó su carpeta de empleado vacía (sin otros ausentismos del mismo
        // mes con archivos propios), también se retira — best-effort, no bloquea el rechazo.
        try {
          const [contractSnap, fieldSnap] = await Promise.all([
            adminDb.collection("contracts").doc(leaveRequest.contractId).get(),
            adminDb.collection("fields").doc(leaveRequest.fieldId).get(),
          ]);
          const contract = contractSnap.data() as Omit<Contract, "id"> | undefined;
          const field = fieldSnap.data() as Omit<FieldDoc, "id"> | undefined;
          if (contract && field) {
            await deleteEmployeeFolderIfEmpty({
              contractNumber: contract.number,
              fieldName: field.name,
              employeeName: leaveRequest.employeeName,
              date: leaveRequest.createdAt.toDate(),
            });
          }
        } catch (error) {
          console.error(`No se pudo limpiar la carpeta de empleado de la solicitud ${id}:`, error);
        }
      }
    }

    const history: LeaveRequestHistoryEntry[] = [
      ...leaveRequest.history,
      { status: "RECHAZADO", at: now, byUid: supervisor.uid, byName: supervisor.name, note: parsed.data.rejectionReason },
    ];
    await requestRef.update({
      status: "RECHAZADO",
      rejectionReason: parsed.data.rejectionReason,
      supportFiles: [],
      history,
      updatedAt: now,
    });

    await logAudit({
      contractId: leaveRequest.contractId,
      actorUid: supervisor.uid,
      actorName: supervisor.name,
      action: "LEAVE_REQUEST_REJECTED",
      entityType: "leaveRequest",
      entityId: id,
      ip: getClientIp(request),
      userAgent: request.headers.get("user-agent"),
      metadata: { reason: parsed.data.rejectionReason },
    });

    await logActivity({
      contractId: leaveRequest.contractId,
      fieldId: leaveRequest.fieldId,
      targetUserIds: [leaveRequest.employeeId],
      actorUid: supervisor.uid,
      actorName: supervisor.name,
      type: "LEAVE_REQUEST_REJECTED",
      title: "Solicitud rechazada",
      description: `Tu solicitud fue rechazada: ${parsed.data.rejectionReason}`,
      relatedEntity: { type: "leaveRequest", id },
    });

    return NextResponse.json({
      ok: true,
      data: { status: "RECHAZADO" },
      ...(deletionWarning ? { warning: deletionWarning } : {}),
    });
  }

  // approve
  const supervisorUserSnap = await adminDb.collection("users").doc(supervisor.uid).get();
  const supervisorCedula = (supervisorUserSnap.data()?.cedula as string | undefined) ?? "";

  const history: LeaveRequestHistoryEntry[] = [
    ...leaveRequest.history,
    { status: "APROBADO", at: now, byUid: supervisor.uid, byName: supervisor.name },
  ];
  await requestRef.update({
    status: "APROBADO",
    supervisorSignature: {
      dataUrl: parsed.data.supervisorSignatureDataUrl,
      signedAt: now,
      signedByUid: supervisor.uid,
      signedByName: supervisor.name,
      signedByCedula: supervisorCedula,
      position: parsed.data.supervisorPosition,
    },
    history,
    updatedAt: now,
  });

  await logAudit({
    contractId: leaveRequest.contractId,
    actorUid: supervisor.uid,
    actorName: supervisor.name,
    action: "LEAVE_REQUEST_APPROVED",
    entityType: "leaveRequest",
    entityId: id,
    ip: getClientIp(request),
    userAgent: request.headers.get("user-agent"),
    metadata: {},
  });

  await logActivity({
    contractId: leaveRequest.contractId,
    fieldId: leaveRequest.fieldId,
    targetUserIds: [leaveRequest.employeeId],
    actorUid: supervisor.uid,
    actorName: supervisor.name,
    type: "LEAVE_REQUEST_APPROVED",
    title: "Solicitud aprobada",
    description: "Tu solicitud fue aprobada. El PDF se está generando.",
    relatedEntity: { type: "leaveRequest", id },
  });

  try {
    await generateAndArchivePdf(id);
  } catch (error) {
    // La solicitud queda APROBADO; el PDF puede reintentarse manualmente sin perder el estado ya alcanzado.
    return NextResponse.json({
      ok: true,
      data: { status: "APROBADO" },
      warning:
        error instanceof Error
          ? `Aprobado, pero falló la generación del PDF: ${error.message}`
          : "Aprobado, pero falló la generación del PDF.",
    });
  }

  return NextResponse.json({ ok: true, data: { status: "FINALIZADO" } });
}
