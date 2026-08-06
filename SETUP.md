# Guía de configuración manual — paso a paso

Esta guía cubre **todo lo que no se puede automatizar desde el código** porque requiere tus propias
cuentas (Google, Firebase, Vercel). Sigue los puntos en orden — cada uno depende del anterior.

---

## 1. Crear el proyecto de Firebase

1. Entra a **https://console.firebase.google.com**.
2. Clic en **"Agregar proyecto"** (Add project).
3. Ponle un nombre, por ejemplo `gestion-ausentismos`. Firebase te asignará un `project-id` único
   (ej. `gestion-ausentismos-a1b2c`) — **anótalo**, lo necesitas más adelante.
4. En el paso de Google Analytics puedes desactivarlo (no es necesario para esta app).
5. Espera a que termine de crear el proyecto y entra al panel.

## 2. Habilitar Authentication (Email/Password)

1. En el menú lateral: **Build → Authentication**.
2. Clic en **"Get started"**.
3. En la pestaña **Sign-in method**, selecciona **Email/Password**.
4. Actívalo (el primer toggle "Email/Password"; el segundo, "Email link", déjalo desactivado) → **Guardar**.

## 3. Crear la base de datos Firestore

1. Menú lateral: **Build → Firestore Database**.
2. Clic en **"Create database"**.
3. Elige la ubicación (región) — una vez elegida **no se puede cambiar**, escoge la más cercana a tus
   usuarios (ej. `nam5 (us-central)` o `southamerica-east1` si buscas Sudamérica).
4. Modo: elige **"Start in production mode"** (las reglas reales las despliega el proyecto en el paso 8,
   no dependas de las reglas de prueba por defecto).

## 4. Obtener las credenciales del cliente (SDK web)

1. Clic en el ícono de engranaje ⚙️ junto a "Project Overview" → **Project settings**.
2. Baja hasta **"Your apps"** → clic en el ícono **`</>`** (Web).
3. Ponle un apodo (ej. `web`) y **NO marques** "Also set up Firebase Hosting" (usamos Vercel, no Firebase Hosting).
4. Firebase te muestra un objeto `firebaseConfig` con: `apiKey`, `authDomain`, `projectId`, `storageBucket`,
   `messagingSenderId`, `appId`.
5. Copia cada valor a tu `.env.local` (basado en `.env.example`), con el prefijo `NEXT_PUBLIC_FIREBASE_`:

   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
   NEXT_PUBLIC_FIREBASE_APP_ID=...
   ```

## 5. Obtener las credenciales del servidor (Admin SDK / Service Account)

1. Sigue en **Project settings** → pestaña **Service accounts**.
2. Clic en **"Generate new private key"** → confirma → se descarga un archivo `.json`.
3. Abre ese archivo. Contiene `project_id`, `client_email` y `private_key`. Cópialos a `.env.local`:

   ```
   FIREBASE_PROJECT_ID=<project_id del json>
   FIREBASE_CLIENT_EMAIL=<client_email del json>
   FIREBASE_PRIVATE_KEY="<private_key del json, con las \n literales, entre comillas>"
   ```

   Importante: el `private_key` del JSON viene con `\n` como texto literal (dos caracteres, barra + n).
   Pégalo tal cual, entre comillas dobles, sin convertir esos `\n` en saltos de línea reales.

4. **Guarda ese archivo `.json` en un lugar seguro fuera del repo** (o bórralo tras copiar los valores) —
   nunca lo subas a git. Ya tiene permisos de administrador total sobre tu proyecto de Firebase.

## 6. Habilitar la API de Google Drive

1. Entra a **https://console.cloud.google.com** y selecciona (arriba a la izquierda) el **mismo proyecto**
   que creaste en Firebase (Firebase crea automáticamente un proyecto de Google Cloud con el mismo ID).
2. Ve a **APIs & Services → Library** (o busca "Library" en el buscador superior).
3. Busca **"Google Drive API"** → ábrela → clic en **"Enable"**.

## 7. Decidir el Service Account para Drive

Tienes dos opciones — elige una:

- **Opción A (más simple):** reutiliza el mismo Service Account del paso 5. Solo debes asegurarte de que
  tenga la Drive API habilitada a nivel de proyecto (ya lo hiciste en el paso 6, que aplica a todo el proyecto).
  En ese caso, en `.env.local` pon los mismos valores:
  ```
  GOOGLE_SERVICE_ACCOUNT_EMAIL=<mismo client_email del paso 5>
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="<misma private_key del paso 5>"
  ```
- **Opción B (más aislado):** crea un Service Account dedicado solo para Drive:
  1. En Google Cloud Console: **IAM & Admin → Service Accounts → Create Service Account**.
  2. Nómbralo (ej. `drive-ausentismos`), sin roles adicionales de proyecto (no los necesita, los permisos
     reales se los das compartiendo la carpeta de Drive en el paso 8).
  3. Una vez creado, entra a él → pestaña **Keys → Add key → Create new key → JSON** → descarga el archivo.
  4. Copia `client_email` y `private_key` de ese JSON a `GOOGLE_SERVICE_ACCOUNT_EMAIL` /
     `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` en `.env.local`.

## 8. Crear la Unidad compartida "Ausentismos" en Google Drive

**Importante — no uses una carpeta normal de "Mi unidad".** Las Service Accounts no tienen cuota de
almacenamiento propia; si subes archivos a una carpeta de "Mi unidad" (aunque esté compartida como
Editor), Drive rechaza la subida con el error `Service Accounts do not have storage quota`. La carpeta
en sí se crea igual (las carpetas no pesan), pero el PDF nunca se sube. La solución de Google para
Workspace es usar una **Unidad compartida (Shared Drive)**: ahí los archivos pertenecen a la unidad, no
a una cuenta individual, así que la Service Account nunca tropieza con este límite.

1. Entra a **https://drive.google.com** con tu cuenta de Google Workspace.
2. En el menú lateral izquierdo, clic en **"Unidades compartidas"** → **"+ Nueva"**.
3. Nómbrala **`Ausentismos`** → Crear.
4. Entra a la unidad recién creada → arriba a la derecha, ícono de personas / **"Gestionar miembros"**.
5. Agrega el correo del Service Account (el mismo `GOOGLE_SERVICE_ACCOUNT_EMAIL` del paso 7, con forma
   `algo@tu-proyecto.iam.gserviceaccount.com`) → rol **Content Manager** (o superior) → Enviar
   (puede advertir que es una cuenta externa a tu organización; confirma igual).
6. Con la Unidad compartida abierta, copia su ID desde la URL del navegador:
   `https://drive.google.com/drive/folders/`**`ESTE_ES_EL_ID`** (para una Unidad compartida, el ID que
   aparece ahí en la URL es el mismo `driveId` de la unidad — no hace falta crear una subcarpeta adentro,
   la app crea automáticamente `Contrato_N/Año/Mes/Campo` dentro de esta unidad).
7. Pégalo en `.env.local`:
   ```
   GOOGLE_DRIVE_ROOT_FOLDER_ID=<el ID copiado>
   ```

Si ya habías creado una carpeta normal y solicitudes quedaron en estado `APROBADO` sin PDF por este
error, no hace falta recrearlas: una vez apuntes `GOOGLE_DRIVE_ROOT_FOLDER_ID` a la Unidad compartida,
usa el botón **"Reintentar generación de PDF"** en el detalle de la solicitud (o en el listado de
Admin) para generarlo sin perder la firma ni el historial ya guardados.

## 9. Completar el resto de `.env.local`

```
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

En local déjalo así. En producción (paso 12) lo cambiarás a la URL real de Vercel.

## 10. Desplegar las reglas e índices de Firestore

Necesitas la Firebase CLI instalada una sola vez:

```bash
npm install -g firebase-tools
firebase login
```

Desde la raíz del proyecto:

```bash
firebase use --add
# Selecciona tu proyecto de la lista y ponle un alias, ej: default

firebase deploy --only firestore:rules,firestore:indexes
```

Esto sube el contenido de `firestore.rules` y `firestore.indexes.json` a tu proyecto real. Sin este paso,
Firestore usará las reglas por defecto (todo bloqueado o todo abierto según cómo lo creaste en el paso 3),
no las reglas de seguridad multi-tenant que ya están escritas en el repo.

## 11. Crear el primer Super Administrador

Este rol es la raíz de la jerarquía, por eso no tiene un enlace de invitación (los demás roles sí).
Ya incluí un script que lo automatiza. Con `.env.local` ya completo (pasos 4 y 5):

```bash
npm run create-super-admin -- tu-correo@ejemplo.com "UnaContraseñaSegura123!" "Tu Nombre Completo"
```

Esto crea el usuario en Firebase Auth (o lo promueve si ya existía), le asigna el custom claim
`role: super-admin` y crea su documento en `users/`. Ya puedes entrar en `/login` con ese correo y
contraseña y llegarás al panel de Super Administrador.

## 12. Probar todo en local

```bash
npm install
npm run dev
```

Abre `http://localhost:3000`, entra como super-admin, crea un contrato de prueba y sigue el flujo
completo (invitar admin → campo → supervisor → empleado → ausentismo → firma → aprobación → PDF en Drive).

## 13. Desplegar en Vercel

1. Sube el repo a GitHub/GitLab/Bitbucket (`git remote add origin ...` + `git push`).
2. Entra a **https://vercel.com/new** e importa el repositorio.
3. Antes del primer deploy, en **Environment Variables**, agrega **todas** las variables de tu
   `.env.local` (las 13: 6 `NEXT_PUBLIC_FIREBASE_*`, 3 `FIREBASE_*`, 2 `GOOGLE_SERVICE_ACCOUNT_*`,
   `GOOGLE_DRIVE_ROOT_FOLDER_ID`, `NEXT_PUBLIC_APP_URL`).
4. Para `NEXT_PUBLIC_APP_URL`, usa el dominio que Vercel te va a asignar (ej. `https://gestion-ausentismos.vercel.app`)
   — si no lo sabes aún, despliega una vez, copia la URL real, y actualiza esta variable + vuelve a desplegar
   (Redeploy) para que los enlaces de invitación generados usen el dominio correcto.
5. Si más adelante conectas un dominio propio, repite el paso anterior con ese dominio.
6. Verifica el plan de Vercel: `vercel.json` fija `maxDuration` de hasta 30s para las rutas que generan PDF
   y suben a Drive. En el plan Hobby el máximo permitido es 10s — si generar el PDF + subir a Drive tarda
   más que eso en producción, tendrás que pasar a un plan Pro (o reducir el timeout y aceptar el riesgo).

## 14. Checklist final rápido

- [ ] Proyecto Firebase creado
- [ ] Authentication con Email/Password habilitado
- [ ] Firestore creado (modo producción)
- [ ] `.env.local` completo (13 variables)
- [ ] Google Drive API habilitada
- [ ] Carpeta "Ausentismos" creada y compartida como Editor con el Service Account
- [ ] `firebase deploy --only firestore:rules,firestore:indexes` ejecutado sin errores
- [ ] Super Administrador creado con `npm run create-super-admin`
- [ ] Flujo completo probado en local
- [ ] Variables de entorno cargadas en Vercel y deploy exitoso
- [ ] `NEXT_PUBLIC_APP_URL` apunta al dominio final de producción
