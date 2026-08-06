import "server-only";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { generateLeaveRequestPdf, TEMPLATE_VERSION } from "@/lib/pdf/leaveRequestTemplate";
import { ensureLeaveRequestFolderPath, uploadPdfToDrive } from "@/lib/drive/folders";
import { logAudit } from "@/lib/audit/log";
import { logActivity } from "@/lib/activity/log";
import type { Contract, FieldDoc, LeaveRequest, LeaveRequestHistoryEntry } from "@/types/domain";

const COMBINING_DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(COMBINING_DIACRITICS, "")
    .replace(/[^a-zA-Z0-9]+/g, "");
}

/** Genera el PDF oficial, lo sube a Drive y finaliza la solicitud. Idempotente: si ya tiene pdf, no regenera. */
export async function generateAndArchivePdf(requestId: string): Promise<void> {
  const requestRef = adminDb.collection("leaveRequests").doc(requestId);
  const snap = await requestRef.get();
  if (!snap.exists) throw new Error("Solicitud no encontrada");
  const leaveRequest = { id: snap.id, ...snap.data() } as LeaveRequest;

  if (leaveRequest.pdf) return; // ya generado, evita duplicados por reintento/doble clic

  const [contractSnap, fieldSnap] = await Promise.all([
    adminDb.collection("contracts").doc(leaveRequest.contractId).get(),
    adminDb.collection("fields").doc(leaveRequest.fieldId).get(),
  ]);
  const contract = contractSnap.data() as Omit<Contract, "id">;
  const field = fieldSnap.data() as Omit<FieldDoc, "id">;

  const bytes = await generateLeaveRequestPdf({
    leaveRequest,
    contractName: contract.name,
    contractNumber: contract.number,
    fieldName: field.name,
  });

  const now = new Date();
  const folderId = await ensureLeaveRequestFolderPath({
    contractNumber: contract.number,
    fieldName: field.name,
    date: now,
  });

  const datePrefix = now.toISOString().slice(0, 10).replace(/-/g, "");
  const fileName = `${datePrefix}_${leaveRequest.employeeCedula}_${slugify(leaveRequest.employeeName)}.pdf`;

  const uploaded = await uploadPdfToDrive({ folderId, fileName, bytes });

  const nowTs = Timestamp.now();
  const historyEntries: LeaveRequestHistoryEntry[] = [
    { status: "PDF_GENERADO", at: nowTs, byUid: "system", byName: "Sistema" },
    { status: "FINALIZADO", at: nowTs, byUid: "system", byName: "Sistema" },
  ];

  await requestRef.update({
    pdf: {
      driveFileId: uploaded.id,
      webViewLink: uploaded.webViewLink,
      generatedAt: nowTs,
      templateVersion: TEMPLATE_VERSION,
    },
    status: "FINALIZADO",
    history: [...leaveRequest.history, ...historyEntries],
    updatedAt: nowTs,
  });

  await logAudit({
    contractId: leaveRequest.contractId,
    actorUid: "system",
    actorName: "Sistema",
    action: "PDF_GENERATED",
    entityType: "leaveRequest",
    entityId: requestId,
    ip: null,
    userAgent: null,
    metadata: { driveFileId: uploaded.id },
  });

  const adminsSnap = await adminDb
    .collection("administrators")
    .where("contractId", "==", leaveRequest.contractId)
    .get();
  const adminUids = adminsSnap.docs.map((d) => d.id);

  await logActivity({
    contractId: leaveRequest.contractId,
    fieldId: leaveRequest.fieldId,
    targetUserIds: [...adminUids, leaveRequest.employeeId],
    actorUid: "system",
    actorName: "Sistema",
    type: "PDF_GENERATED",
    title: "PDF generado",
    description: `Se generó el PDF del ausentismo de ${leaveRequest.employeeName}.`,
    relatedEntity: { type: "leaveRequest", id: requestId },
  });
}
