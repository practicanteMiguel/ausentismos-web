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

/** Resuelve/crea Ausentismos/Contrato_{n}/{año}/{Mes}/{Campo}, devolviendo el folderId final. */
export async function ensureLeaveRequestFolderPath(params: {
  contractNumber: string;
  fieldName: string;
  date: Date;
}): Promise<string> {
  const contractFolder = await ensureFolder(`Contrato_${params.contractNumber}`, rootFolderId());
  const yearFolder = await ensureFolder(String(params.date.getFullYear()), contractFolder);
  const monthFolder = await ensureFolder(MONTH_NAMES_ES[params.date.getMonth()], yearFolder);
  const fieldFolder = await ensureFolder(params.fieldName, monthFolder);
  return fieldFolder;
}

export async function ensureContractFolder(contractNumber: string): Promise<string> {
  return ensureFolder(`Contrato_${contractNumber}`, rootFolderId());
}

export async function uploadPdfToDrive(params: {
  folderId: string;
  fileName: string;
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
      mimeType: "application/pdf",
      body: stream,
    },
    fields: "id, webViewLink",
    supportsAllDrives: true,
  });

  if (!created.data.id || !created.data.webViewLink) {
    throw new Error("No se pudo subir el PDF a Google Drive.");
  }

  return { id: created.data.id, webViewLink: created.data.webViewLink };
}

/**
 * Descarga el binario de un PDF desde Drive usando el Service Account (que siempre tiene acceso,
 * al ser quien lo subió). Así el servidor puede servirlo directo al navegador sin que el usuario
 * final necesite ningún permiso de Drive — la carpeta es privada y nunca se comparte con empleados.
 */
export async function downloadPdfFromDrive(fileId: string): Promise<Buffer> {
  const drive = getDrive();
  const response = await drive.files.get(
    { fileId, alt: "media", supportsAllDrives: true },
    { responseType: "arraybuffer" }
  );
  return Buffer.from(response.data as ArrayBuffer);
}
