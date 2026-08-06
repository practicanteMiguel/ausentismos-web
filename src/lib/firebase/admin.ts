import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

function buildAdminApp(): App {
  if (getApps().length) return getApps()[0];

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Faltan variables de entorno de Firebase Admin (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY). Ver .env.example."
    );
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

let cachedApp: App | undefined;
function getAdminApp(): App {
  if (!cachedApp) cachedApp = buildAdminApp();
  return cachedApp;
}

/**
 * Envuelve el SDK en un Proxy para retrasar la inicialización (y la validación de env vars)
 * hasta el primer uso real en tiempo de request. Evita que `next build` falle al analizar
 * estáticamente los Route Handlers, que importan este módulo sin que existan credenciales.
 */
function lazy<T extends object>(factory: () => T): T {
  let instance: T | undefined;
  function resolve(): T {
    if (!instance) instance = factory();
    return instance;
  }
  return new Proxy({} as T, {
    get(_target, prop) {
      const real = resolve();
      const value = Reflect.get(real as object, prop, real);
      return typeof value === "function" ? value.bind(real) : value;
    },
  });
}

export const adminAuth: Auth = lazy(() => getAuth(getAdminApp()));
export const adminDb: Firestore = lazy(() => getFirestore(getAdminApp()));
