// Crea (o promueve) el primer Super Administrador de la plataforma.
//
// Uso:
//   node --env-file=.env.local scripts/create-super-admin.mjs <email> <password> "<Nombre completo>"
//
// Requiere que .env.local ya tenga FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY
// (las mismas credenciales de Service Account que usa la app en el servidor).

import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const [, , email, password, name] = process.argv;

if (!email || !password || !name) {
  console.error(
    'Uso: node --env-file=.env.local scripts/create-super-admin.mjs <email> <password> "<Nombre completo>"'
  );
  process.exit(1);
}

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  console.error(
    "Faltan FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY. Ejecuta con --env-file=.env.local"
  );
  process.exit(1);
}

initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const auth = getAuth();
const db = getFirestore();

async function main() {
  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(email);
    console.log(`Usuario existente encontrado (${userRecord.uid}), se promoverá a super-admin.`);
  } catch {
    userRecord = await auth.createUser({ email, password, displayName: name });
    console.log(`Usuario creado (${userRecord.uid}).`);
  }

  await auth.setCustomUserClaims(userRecord.uid, {
    role: "super-admin",
    contractId: null,
    fieldId: null,
    supervisorId: null,
  });

  await db.collection("users").doc(userRecord.uid).set(
    {
      role: "super-admin",
      contractId: null,
      fieldId: null,
      supervisorId: null,
      name,
      email,
      cedula: null,
      status: "ACTIVO",
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  console.log(`Listo. ${email} ya puede iniciar sesión en /login como Super Administrador.`);
  process.exit(0);
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
