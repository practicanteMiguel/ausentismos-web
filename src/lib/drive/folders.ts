import "server-only";
import { Readable } from "stream";
import { getDrive } from "@/lib/drive/client";

function rootFolderId(): string {
  const id = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  if (!id) {
    throw new Error(
      "Falta GOOGLE_DRIVE_ROOT_FOLDER_ID (ID de la Unidad compartida 'Ausentismos', con el Service Account como miembro). Ver .env.example."
    );
  }
  return id;
}

/** Busca una subcarpeta por nombre bajo `parentId`; la crea si no existe. Idempotente. */
export async function ensureFolder(name: string, parentId: string): Promise<string> {
  const drive = getDrive();
  const safeName = name.replace(/'/g, "\\'");

  const existing = await drive.files.list({
    q: `name = '${safeName}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id, name)",
    spaces: "drive",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  const found = existing.data.files?.[0];
  if (found?.id) return found.id;

  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id",
    supportsAllDrives: true,
  });

  if (!created.data.id) throw new Error(`No se pudo crear la carpeta '${name}' en Drive.`);
  return created.data.id;
}

const MONTH_NAMES_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

/**
 * Resuelve/crea Ausentismos/Contrato_{n}/{año}/{Mes}/{Campo}/{Empleado}, devolviendo el
 * folderId final. La carpeta por empleado agrupa ahí el PDF del ausentismo junto con sus
 * documentos de soporte; si el empleado tiene varios ausentismos el mismo mes, todos caen en
 * esa misma carpeta (ensureFolder es idempotente: la busca por nombre antes de crearla).
 */
export async function ensureLeaveRequestFolderPath(params: {
  contractNumber: string;
  fieldName: string;
  employeeName: string;
  date: Date;
}): Promise<string> {
  const contractFolder = await ensureFolder(`Contrato_${params.contractNumber}`, rootFolderId());
  const yearFolder = await ensureFolder(String(params.date.getFullYear()), contractFolder);
  const monthFolder = await ensureFolder(MONTH_NAMES_ES[params.date.getMonth()], yearFolder);
  const fieldFolder = await ensureFolder(params.fieldName, monthFolder);
  const employeeFolder = await ensureFolder(params.employeeName, fieldFolder);
  return employeeFolder;
}

export async function ensureContractFolder(contractNumber: string): Promise<string> {
  return ensureFolder(`Contrato_${contractNumber}`, rootFolderId());
}

export async function uploadFileToDrive(params: {
  folderId: string;
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
}): Promise<{ id: string; webViewLink: string }> {
  const drive = getDrive();
  const stream = Readable.from(Buffer.from(params.bytes));

  const created = await drive.files.create({
    requestBody: {
      name: params.fileName,
      parents: [params.folderId],
    },
    media: {
      mimeType: params.mimeType,
      body: stream,
    },
    fields: "id, webViewLink",
    supportsAllDrives: true,
  });

  if (!created.data.id || !created.data.webViewLink) {
    throw new Error("No se pudo subir el archivo a Google Drive.");
  }

  return { id: created.data.id, webViewLink: created.data.webViewLink };
}

export async function uploadPdfToDrive(params: {
  folderId: string;
  fileName: string;
  bytes: Uint8Array;
}): Promise<{ id: string; webViewLink: string }> {
  return uploadFileToDrive({ ...params, mimeType: "application/pdf" });
}

/**
 * Descarga el binario de un archivo desde Drive usando el Service Account (que siempre tiene
 * acceso, al ser quien lo subió). Así el servidor puede servirlo directo al navegador sin que
 * el usuario final necesite ningún permiso de Drive — la carpeta es privada y nunca se comparte
 * con empleados. Sirve tanto para el PDF del ausentismo como para sus documentos de soporte.
 */
export async function downloadFileFromDrive(fileId: string): Promise<Buffer> {
  const drive = getDrive();
  const response = await drive.files.get(
    { fileId, alt: "media", supportsAllDrives: true },
    { responseType: "arraybuffer" }
  );
  return Buffer.from(response.data as ArrayBuffer);
}

export const downloadPdfFromDrive = downloadFileFromDrive;

/**
 * Retira un archivo de circulación mandándolo a la papelera de Drive (no `files.delete`
 * permanente). En una Unidad compartida, `files.delete` exige rol de Organizador sobre el
 * archivo; la cuenta de servicio normalmente solo tiene "Content Manager" (lo que pide
 * SETUP.md), que sí alcanza para mandar a papelera pero no para el borrado permanente — y la
 * API de Drive responde 404 "File not found" en vez de 403 cuando falta ese permiso, lo que
 * hacía parecer (equivocadamente) un problema de tiempo/propagación. Como además se borra la
 * referencia en Firestore, el archivo deja de ser accesible desde la app de inmediato aunque
 * técnicamente siga en la papelera de Drive hasta que se purgue (Drive la vacía solo).
 */
export async function deleteDriveFile(fileId: string): Promise<void> {
  const drive = getDrive();
  await drive.files.update({
    fileId,
    requestBody: { trashed: true },
    supportsAllDrives: true,
  });
}

/** true si la carpeta no tiene ningún contenido activo (sin contar lo ya enviado a papelera). */
export async function isDriveFolderEmpty(folderId: string): Promise<boolean> {
  const drive = getDrive();
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id)",
    pageSize: 1,
    spaces: "drive",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  return (res.data.files?.length ?? 0) === 0;
}

/** Manda la carpeta de un empleado a la papelera si, tras un rechazo, quedó sin nada adentro. */
export async function deleteEmployeeFolderIfEmpty(params: {
  contractNumber: string;
  fieldName: string;
  employeeName: string;
  date: Date;
}): Promise<void> {
  const folderId = await ensureLeaveRequestFolderPath(params);
  if (await isDriveFolderEmpty(folderId)) {
    await deleteDriveFile(folderId);
  }
}
