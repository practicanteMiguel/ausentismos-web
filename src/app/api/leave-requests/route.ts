import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit/log";
import { logActivity } from "@/lib/activity/log";
import { getClientIp } from "@/lib/http/ip";
import { calcLeaveDays, calcLeaveHours } from "@/lib/leaveRequests/calc";
import {
  LEAVE_TYPE_GROUP,
  OTRA_LEAVE_TYPES,
  type LeaveRequestHistoryEntry,
  type LeaveType,
} from "@/types/domain";

const LEAVE_TYPES = Object.keys(LEAVE_TYPE_GROUP) as [LeaveType, ...LeaveType[]];

const bodySchema = z
  .object({
    position: z.string().trim().min(2).max(120),
    type: z.enum(LEAVE_TYPES),
    otherReasonText: z.string().trim().max(300).nullable(),
    startDate: z.string().min(1),
    endDate: z.string().min(1),
    startTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .nullable(),
    endTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .nullable(),
    isPaid: z.boolean(),
    medicalNotifiedAt: z.string().nullable(),
    medicalMethod: z.enum(["CORREO_ELECTRONICO", "RADICADO_PRESENCIAL"]).nullable(),
    nonMedicalSupportDescription: z.string().trim().max(2000).nullable(),
    employeeSignatureDataUrl: z.string().startsWith("data:image/png;base64,"),
  })
  .superRefine((data, ctx) => {
    if (new Date(data.endDate) < new Date(data.startDate)) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "La fecha fin no puede ser anterior a la fecha inicio.",
      });
    }

    const group = LEAVE_TYPE_GROUP[data.type];

    if (OTRA_LEAVE_TYPES.includes(data.type) && !data.otherReasonText) {
      ctx.addIssue({ code: "custom", path: ["otherReasonText"], message: "Especifica el motivo." });
    }

    if (group === "MEDICO") {
      if (!data.medicalNotifiedAt) {
        ctx.addIssue({
          code: "custom",
          path: ["medicalNotifiedAt"],
          message: "Ingresa la fecha de notificación.",
        });
      }
      if (!data.medicalMethod) {
        ctx.addIssue({
          code: "custom",
          path: ["medicalMethod"],
          message: "Selecciona el medio de notificación.",
        });
      }
    }

    if ((group === "NO_MEDICO" || group === "EXTRALEGAL") && !data.nonMedicalSupportDescription) {
      ctx.addIssue({
        code: "custom",
        path: ["nonMedicalSupportDescription"],
        message: "Describe los documentos que soportan este ausentismo.",
      });
    }
  });

export async function POST(request: NextRequest) {
  const employee = await requireRole("employee");
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 }
    );
  }
  const data = parsed.data;

  const userSnap = await adminDb.collection("users").doc(employee.uid).get();
  const userData = userSnap.data();
  if (!userData) {
    return NextResponse.json({ ok: false, error: "Perfil de usuario no encontrado" }, { status: 404 });
  }

  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);
  const numDays = calcLeaveDays(startDate, endDate);
  const numHours = calcLeaveHours(numDays, data.startTime, data.endTime);

  const now = Timestamp.now();
  const history: LeaveRequestHistoryEntry[] = [
    { status: "ENVIADO", at: now, byUid: employee.uid, byName: userData.name },
    { status: "PENDIENTE_SUPERVISOR", at: now, byUid: employee.uid, byName: userData.name },
  ];

  const requestRef = adminDb.collection("leaveRequests").doc();
  await requestRef.set({
    contractId: employee.contractId,
    fieldId: employee.fieldId,
    supervisorId: employee.supervisorId,
    employeeId: employee.uid,
    employeeName: userData.name,
    employeeCedula: userData.cedula ?? "",
    position: data.position,
    type: data.type,
    otherReasonText: data.otherReasonText,
    startDate,
    endDate,
    startTime: data.startTime,
    endTime: data.endTime,
    numDays,
    numHours,
    isPaid: data.isPaid,
    medicalSupport: data.medicalNotifiedAt
      ? { notifiedAt: new Date(data.medicalNotifiedAt), method: data.medicalMethod }
      : null,
    nonMedicalSupportDescription: data.nonMedicalSupportDescription,
    status: "PENDIENTE_SUPERVISOR",
    employeeSignature: {
      dataUrl: data.employeeSignatureDataUrl,
      signedAt: now,
      signedByUid: employee.uid,
      signedByName: userData.name,
      signedByCedula: userData.cedula ?? "",
      position: data.position,
    },
    supervisorSignature: null,
    rejectionReason: null,
    pdf: null,
    history,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await logAudit({
    contractId: employee.contractId,
    actorUid: employee.uid,
    actorName: userData.name,
    action: "LEAVE_REQUEST_CREATED",
    entityType: "leaveRequest",
    entityId: requestRef.id,
    ip: getClientIp(request),
    userAgent: request.headers.get("user-agent"),
    metadata: { type: data.type },
  });

  if (employee.supervisorId) {
    await logActivity({
      contractId: employee.contractId,
      fieldId: employee.fieldId,
      targetUserIds: [employee.supervisorId],
      actorUid: employee.uid,
      actorName: userData.name,
      type: "LEAVE_REQUEST_SUBMITTED",
      title: "Nueva solicitud de ausentismo",
      description: `${userData.name} envió una solicitud pendiente de tu revisión.`,
      relatedEntity: { type: "leaveRequest", id: requestRef.id },
    });
  }

  return NextResponse.json({ ok: true, data: { id: requestRef.id } });
}
