import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";

export const ADMINISTRACION_FIELD_NAME = "Administración";

/**
 * El administrador de un contrato no pertenece a ningún campo real, pero LeaveRequest.fieldId
 * es obligatorio (se usa para la carpeta en Drive y en todos los reportes/filtros existentes).
 * En vez de volver ese campo opcional en todo el código, se resuelve/crea un campo "virtual"
 * por contrato, una sola vez (idempotente), y se usa solo para los ausentismos propios del admin.
 */
export async function getOrCreateAdministracionField(
  contractId: string,
  createdBy: string
): Promise<{ id: string; name: string }> {
  const existing = await adminDb
    .collection("fields")
    .where("contractId", "==", contractId)
    .where("name", "==", ADMINISTRACION_FIELD_NAME)
    .limit(1)
    .get();

  if (!existing.empty) {
    return { id: existing.docs[0].id, name: ADMINISTRACION_FIELD_NAME };
  }

  const ref = adminDb.collection("fields").doc();
  await ref.set({
    contractId,
    name: ADMINISTRACION_FIELD_NAME,
    status: "ACTIVO",
    driveFolderId: null,
    createdAt: FieldValue.serverTimestamp(),
    createdBy,
  });
  return { id: ref.id, name: ADMINISTRACION_FIELD_NAME };
}
