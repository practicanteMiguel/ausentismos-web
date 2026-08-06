import "server-only";
import { google } from "googleapis";

function buildAuth() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey) {
    throw new Error(
      "Faltan variables de entorno de Google Drive (GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY). Ver .env.example."
    );
  }

  return new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
}

let driveClient: ReturnType<typeof google.drive> | null = null;

export function getDrive() {
  if (!driveClient) {
    driveClient = google.drive({ version: "v3", auth: buildAuth() });
  }
  return driveClient;
}
