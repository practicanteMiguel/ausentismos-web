import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit/log";
import { logActivity } from "@/lib/activity/log";
import { getClientIp } from "@/lib/http/ip";
import { calcLeaveDays, calcLeaveHours } from "@/lib/leaveRequests/calc";
import { decodeDataUrl } from "@/lib/dataUrl";
import { ensureLeaveRequestFolderPath, uploadFileToDrive } from "@/lib/drive/folders";
import { getOrCreateAdministracionField } from "@/lib/fields/administracion";
import {
  LEAVE_TYPE_GROUP,
  OTRA_LEAVE_TYPES,
  type Contract,
  type FieldDoc,
  type LeaveRequestHistoryEntry,
  type LeaveType,
  type SupportFile,
} from "@/types/domain";

const LEAVE_TYPES = Object.keys(LEAVE_TYPE_GROUP) as [LeaveType, ...LeaveType[]];
const MAX_SUPPORT_FILES = 2;

const bodySchema = z
  .object({
    position: z.string().trim().min(2).max(120),
    type: z.enum(LEAVE_TYPES),
    otherReasonText: z.string().trim().max(300).nullable(),
    workSchedule: z.enum(["5x2", "6x6"]),
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
    supportFiles: z
      .array(
        z.object({
          name: z.string().trim().min(1).max(200),
          mimeType: z
            .string()
            .refine((t) => t === "application/pdf" || t.startsWith("image/"), {
              message: "Los documentos de soporte deben ser PDF o imagen.",
            }),
          dataUrl: z.string().regex(/^data:[\w./+-]+;base64,/),
        })
      )
      .max(MAX_SUPPORT_FILES),
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

    // Un día de margen respecto a la medianoche UTC de hoy: el empleado elige la fecha en su
    // hora local (ej. Colombia, UTC-5) y ese "hoy" puede ya ser "mañana" en UTC durante la noche
    // — sin este margen se rechazaría por error un "hoy" válido elegido en la última parte del día.
    const todayUtcMidnight = new Date();
    todayUtcMidnight.setUTCHours(0, 0, 0, 0);
    const minAllowedDate = new Date(todayUtcMidnight.getTime() - 24 * 60 * 60 * 1000);
    if (new Date(data.startDate) < minAllowedDate) {
      ctx.addIssue({
        code: "custom",
        path: ["startDate"],
        message: "La fecha de inicio no puede ser anterior a hoy.",
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
  // Empleado: como siempre, revisa su supervisor. Supervisor/admin: ahora también pueden crear
  // su propio ausentismo — sube un nivel en la jerarquía y lo revisa el coordinador del contrato
  // (mismo mecanismo de siempre, no se toca nada de lo que ya existía para empleado→supervisor).
  const requester = await requireRole("employee", "supervisor", "admin");
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 }
    );
  }
  const data = parsed.data;

  const userSnap = await adminDb.collection("users").doc(requester.uid).get();
  const userData = userSnap.data();
  if (!userData) {
    return NextResponse.json({ ok: false, error: "Perfil de usuario no encontrado" }, { status: 404 });
  }

  let fieldId: string;
  let reviewerId: string;
  if (requester.role === "employee") {
    fieldId = requester.fieldId!;
    reviewerId = requester.supervisorId!;
  } else {
    const coordinatorSnap = await adminDb
      .collection("coordinators")
      .where("contractId", "==", requester.contractId)
      .limit(1)
      .get();
    if (coordinatorSnap.empty) {
      return NextResponse.json(
        {
          ok: false,
          error: "Tu contrato aún no tiene un coordinador asignado. Contacta al super-admin.",
        },
        { status: 409 }
      );
    }
    reviewerId = coordinatorSnap.docs[0].id;
    fieldId =
      requester.role === "supervisor"
        ? requester.fieldId!
        : (await getOrCreateAdministracionField(requester.contractId!, requester.uid)).id;
  }

  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);
  const numDays = calcLeaveDays(startDate, endDate, data.workSchedule);
  const numHours = calcLeaveHours(numDays, data.startTime, data.endTime);

  // Los documentos de soporte se suben a Drive ya al crear la solicitud (no al aprobarla): si
  // se rechaza, se eliminan (ver review/route.ts) — así nunca queda nada archivado de una
  // solicitud rechazada, cumpliendo el pedido de "si se rechaza no debe guardar nada".
  let supportFiles: SupportFile[] = [];
  if (data.supportFiles.length > 0) {
    const [contractSnap, fieldSnap] = await Promise.all([
      adminDb.collection("contracts").doc(requester.contractId!).get(),
      adminDb.collection("fields").doc(fieldId).get(),
    ]);
    const contract = contractSnap.data() as Omit<Contract, "id"> | undefined;
    const field = fieldSnap.data() as Omit<FieldDoc, "id"> | undefined;
    if (!contract || !field) {
      return NextResponse.json({ ok: false, error: "Contrato o campo no encontrado" }, { status: 404 });
    }

    try {
      const folderId = await ensureLeaveRequestFolderPath({
        contractNumber: contract.number,
        fieldName: field.name,
        employeeName: userData.name,
        date: new Date(),
      });
      const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      supportFiles = await Promise.all(
        data.supportFiles.map(async (file, index) => {
          const uploaded = await uploadFileToDrive({
            folderId,
            fileName: `${datePrefix}_Soporte${index + 1}_${file.name}`,
            mimeType: file.mimeType,
            bytes: decodeDataUrl(file.dataUrl),
          });
          return { driveFileId: uploaded.id, name: file.name, mimeType: file.mimeType };
        })
      );
    } catch {
      return NextResponse.json(
        { ok: false, error: "No se pudieron subir los documentos de soporte. Intenta de nuevo." },
        { status: 502 }
      );
    }
  }

  const now = Timestamp.now();
  const history: LeaveRequestHistoryEntry[] = [
    { status: "ENVIADO", at: now, byUid: requester.uid, byName: userData.name },
    { status: "PENDIENTE_SUPERVISOR", at: now, byUid: requester.uid, byName: userData.name },
  ];

  const requestRef = adminDb.collection("leaveRequests").doc();
  await requestRef.set({
    contractId: requester.contractId,
    fieldId,
    supervisorId: reviewerId,
    employeeId: requester.uid,
    employeeName: userData.name,
    employeeCedula: userData.cedula ?? "",
    position: data.position,
    type: data.type,
    otherReasonText: data.otherReasonText,
    startDate,
    endDate,
    startTime: data.startTime,
    endTime: data.endTime,
    workSchedule: data.workSchedule,
    numDays,
    numHours,
    isPaid: data.isPaid,
    medicalSupport: data.medicalNotifiedAt
      ? { notifiedAt: new Date(data.medicalNotifiedAt), method: data.medicalMethod }
      : null,
    nonMedicalSupportDescription: data.nonMedicalSupportDescription,
    supportFiles,
    status: "PENDIENTE_SUPERVISOR",
    employeeSignature: {
      dataUrl: data.employeeSignatureDataUrl,
      signedAt: now,
      signedByUid: requester.uid,
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
    contractId: requester.contractId,
    actorUid: requester.uid,
    actorName: userData.name,
    action: "LEAVE_REQUEST_CREATED",
    entityType: "leaveRequest",
    entityId: requestRef.id,
    ip: getClientIp(request),
    userAgent: request.headers.get("user-agent"),
    metadata: { type: data.type },
  });

  await logActivity({
    contractId: requester.contractId,
    fieldId,
    targetUserIds: [reviewerId],
    actorUid: requester.uid,
    actorName: userData.name,
    type: "LEAVE_REQUEST_SUBMITTED",
    title: "Nueva solicitud de ausentismo",
    description: `${userData.name} envió una solicitud pendiente de tu revisión.`,
    relatedEntity: { type: "leaveRequest", id: requestRef.id },
  });

  return NextResponse.json({ ok: true, data: { id: requestRef.id } });
}
