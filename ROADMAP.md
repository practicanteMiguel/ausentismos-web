# Plataforma de Gestión Digital de Ausentismos — Arquitectura y Roadmap Técnico

> Documento de diseño funcional, técnico y arquitectónico. Sirve como fuente de verdad del proyecto.
> Stack: Next.js 16 (App Router) + TypeScript + TailwindCSS + shadcn/ui · Firebase Auth · Cloud Firestore · Google Drive API · Vercel · pdf-lib · react-signature-canvas.

---

## 1. Visión General de la Arquitectura

```
Presentación (Next.js App Router + shadcn/ui)
        │
        ▼
Lógica de negocio (Route Handlers /api/*, Server Actions, "services/" en servidor)
        │
        ▼
Persistencia (Cloud Firestore — solo datos de negocio)
        │
        ▼
Almacenamiento documental (Google Drive API — solo PDFs)
```

Reglas arquitectónicas fijas:

- **Nunca** se guardan PDFs ni binarios en Firestore. Firestore solo referencia el `driveFileId` / `webViewLink`.
- Toda escritura sensible (contratos, aprobaciones, generación de PDF) pasa por un **Route Handler** en el servidor, nunca directo desde el cliente al Drive API o con Service Account expuesta.
- El cliente (browser) solo habla con: Firebase Auth SDK, Firestore SDK (protegido por Security Rules) y los Route Handlers propios (`/api/**`) para todo lo que requiera credenciales privilegiadas (Drive, PDF, claims).
- **Multi-tenant por contrato**: todo documento de negocio lleva `contractId`. Las Security Rules y las queries siempre filtran por `contractId` derivado del token del usuario (custom claims), nunca de un valor enviado por el cliente.

### 1.1 Estructura de carpetas del repo (Next.js)

```
src/
  app/
    (public)/                     landing, login, invite/[role]/[token]
    (app)/                        rutas protegidas por rol (route groups)
      super-admin/...
      admin/...
      supervisor/...
      employee/...
    api/
      invites/...                 crear/validar invitaciones
      contracts/...
      fields/...
      users/...
      leave-requests/...
      pdf/...
      drive/...
      activities/...
      audit/...
      auth/session/...            login/logout de session cookie
  components/
    ui/                           shadcn/ui primitives
    activity-center/
    dashboards/
    forms/
    signature/
  lib/
    firebase/
      client.ts                  Firebase client SDK (browser)
      admin.ts                   Firebase Admin SDK (server-only)
    drive/
      client.ts                  Google Drive client (server-only, service account)
      folders.ts                 lógica de resolución/creación de carpetas
    pdf/
      leaveRequestTemplate.ts    generación del PDF con pdf-lib
    auth/
      session.ts                 verificación de session cookie + claims
      roles.ts                   tipos y guards de rol
    firestore/
      collections.ts             nombres de colecciones + converters tipados
      queries/*.ts                queries reutilizables por rol
    audit/
      log.ts                     helper para escribir auditLogs
    activity/
      log.ts                     helper para escribir activities
  types/
    domain.ts                    tipos de dominio compartidos (Contract, Field, User, LeaveRequest...)
  middleware.ts                  protección de rutas por rol vía session cookie
firestore.rules
firestore.indexes.json
vercel.json
.env.example
```

---

## 2. Jerarquía y Modelo de Autorización

```
Super Administrador
   └─ Contrato (N)
        └─ Administrador del contrato (N)
             └─ Campo (N)
                  └─ Supervisor (N)
                       └─ Empleado (N)
```

- El rol y las relaciones (`contractId`, `fieldId`, `supervisorId`) se fijan **en el momento del registro vía invitación** y se escriben como **Firebase Custom Claims** + espejo en el documento `users/{uid}` (para queries; los claims son la fuente de verdad para las Security Rules porque no requieren una lectura extra).
- Un usuario nunca elige su contrato/campo/supervisor: se deriva 100% del token de invitación.

## 3. Modelo de Datos (Firestore)

Colecciones raíz, todas con `contractId` (excepto `contracts` y `auditLogs`/`activities` globales que lo llevan como campo):

```
contracts/{contractId}
  { number, name, startDate, endDate, status, driveFolderId, createdAt, createdBy }

fields/{fieldId}
  { contractId, name, status, driveFolderPath, createdAt, createdBy }

invites/{token}
  { role: 'admin'|'supervisor'|'employee', contractId, fieldId?, supervisorId?,
    createdBy, createdAt, expiresAt?, usesRemaining?, revoked }

users/{uid}                          # documento espejo, 1 por usuario autenticado
  { role, contractId, fieldId?, supervisorId?, name, email, cedula?, status, createdAt }

employees/{uid}      → subconjunto de users con role='employee', datos propios de RRHH
supervisors/{uid}    → subconjunto de users con role='supervisor'
administrators/{uid} → subconjunto de users con role='admin'

leaveRequests/{id}
  { contractId, fieldId, supervisorId, employeeId,
    type, startDate, endDate, reason, description,
    status: 'BORRADOR'|'ENVIADO'|'PENDIENTE_SUPERVISOR'|'RECHAZADO'|'APROBADO'|'PDF_GENERADO'|'FINALIZADO',
    employeeSignature: { dataUrl|storageRef, signedAt },
    supervisorSignature: { dataUrl|storageRef, signedAt, supervisorId },
    rejectionReason?, pdf: { driveFileId, webViewLink, generatedAt } | null,
    createdAt, updatedAt, history: [{status, at, byUid}] }

activities/{id}
  { contractId, fieldId?, targetUserIds: [uid...], actorUid, actorName,
    type, title, description, relatedEntity: {type, id},
    createdAt, readBy: {uid: timestamp} }

auditLogs/{id}
  { contractId?, actorUid, actorName, action, entityType, entityId,
    ip?, userAgent?, createdAt, metadata }
```

**Decisiones de diseño:**
- `employees` / `supervisors` / `administrators` son colecciones **derivadas** (no duplican todo — solo lo necesario para listados rápidos por rol); `users` sigue siendo la fuente de verdad para auth/roles.
- `leaveRequests.history[]` evita perder trazabilidad de estado sin necesitar una colección aparte; para auditoría fina y global se usa `auditLogs`.
- Índices compuestos necesarios (`firestore.indexes.json`): `leaveRequests(contractId, status, createdAt)`, `leaveRequests(supervisorId, status)`, `leaveRequests(employeeId, createdAt)`, `activities(targetUserIds array-contains, createdAt)`.
- Nunca se hace `delete`: los estados terminales son `RECHAZADO` (con posibilidad de reenviar como nueva versión) y `FINALIZADO`.

## 4. Google Drive — Organización Documental

```
Ausentismos/
  Contrato_{number}/
    {year}/
      {MonthName}/
        {FieldName}/
          {yyyyMMdd}_{cedula}_{NombreSinEspacios}.pdf
```

- Un **Service Account** de Google Cloud (con Drive API habilitada) es el único actor que escribe en Drive. Sus credenciales viven solo en variables de entorno del servidor (`GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`), nunca en el cliente.
- La carpeta raíz `Ausentismos/` se comparte una única vez con el Service Account (o se crea con él como owner) y se guarda su `folderId` en una env var (`GOOGLE_DRIVE_ROOT_FOLDER_ID`).
- `lib/drive/folders.ts` implementa `ensureFolderPath(contractNumber, year, month, fieldName)`: busca por nombre bajo el padre correspondiente y crea únicamente si no existe (evita duplicados y llamadas innecesarias). Los `folderId` resueltos se cachean en el documento del contrato/campo en Firestore (`driveFolderId`) para no tener que resolver toda la ruta en cada PDF.

## 5. Seguridad

- **Autenticación**: Firebase Auth (email/password). Tras login, un Route Handler intercambia el ID token por una **session cookie** (`firebase-admin` `createSessionCookie`), httpOnly, secure, 5-14 días. `middleware.ts` la valida en cada request a rutas protegidas y redirige por rol.
- **Autorización de UI**: route groups `(app)/super-admin`, `(app)/admin`, `(app)/supervisor`, `(app)/employee` — el middleware bloquea el acceso cruzado entre roles.
- **Autorización de datos**: Firestore Security Rules (ver `firestore.rules`), basadas en custom claims (`role`, `contractId`, `fieldId`, `supervisorId`), no en datos del documento (evita TOCTOU). Resumen:
  - `employee`: lectura/escritura solo de sus propios `leaveRequests` (`employeeId == uid`) y su propio `users/{uid}`.
  - `supervisor`: lectura de `leaveRequests` de empleados de su `fieldId`; escritura solo de campos de revisión/firma, nunca de los datos del empleado.
  - `admin`: lectura de todo lo de su `contractId`; sin escritura directa sobre `leaveRequests` (solo lectura/descarga).
  - `super-admin`: acceso completo vía custom claim `role == 'super-admin'`.
  - Las invitaciones (`invites/{token}`) son de solo lectura pública controlada por Route Handler (validación de expiración/usos), nunca de escritura directa desde el cliente.
- **Secretos**: Service Account de Drive y credenciales de Firebase Admin solo en variables de entorno de Vercel (nunca en el repo). `.env.example` documenta cada una sin valores reales.

## 6. Centro de Actividad y Auditoría (transversal)

- `activities`: escritura server-side desde cada Route Handler que cambia estado relevante (nunca desde el cliente). Lectura en tiempo real vía `onSnapshot` filtrando `targetUserIds array-contains uid`, ordenado por `createdAt desc`, paginado (`limit` + cursor).
- `auditLogs`: se escribe desde un helper único `logAudit()` invocado en cada acción de negocio del lado servidor (login, creación de contrato/campo/usuario, transición de estado de solicitud, firma, generación y descarga de PDF). Incluye IP (`x-forwarded-for`) y user agent cuando estén disponibles. Colección de solo-escritura para clientes (lectura restringida a `super-admin`).

## 7. Convenciones de Código

- Server Actions / Route Handlers devuelven un tipo `Result<T> = { ok: true; data: T } | { ok: false; error: string }` — nunca se lanzan excepciones no controladas al cliente.
- Validación de payloads con `zod` en el borde del servidor (todas las rutas `/api/**`).
- Componentes de servidor por defecto; `"use client"` solo donde se necesita interactividad (formularios, canvas de firma, listeners realtime).
- Sin ORM: acceso a Firestore vía *converters* tipados (`withConverter`) definidos en `lib/firestore/collections.ts` para que cada colección tenga tipos fuertes de lectura/escritura.

---

## 8. Roadmap por Fases

### Fase 1 — Arquitectura General
- **Objetivo**: dejar el esqueleto del proyecto, convenciones y librerías base instaladas y funcionando en local y en Vercel (build verde).
- **Arquitectura**: estructura de carpetas de la sección 1.1; configuración de TypeScript estricto, ESLint, Tailwind, shadcn/ui.
- **Colecciones**: ninguna aún (se define el esquema de tipos en `types/domain.ts`).
- **Componentes**: shell de layout (`app/layout.tsx`), theming shadcn, `lib/firebase/*` stubs.
- **Pantallas**: landing pública mínima.
- **Riesgos**: elegir mal la convención de carpetas obliga a refactors costosos después → mitigado fijándola en este documento antes de escribir features.
- **Buenas prácticas**: TS estricto, path alias `@/*`, commits atómicos por fase.
- **Criterios de aceptación**: `npm run build` y `npm run lint` pasan sin errores; layout base renderiza.

### Fase 2 — Autenticación
- **Objetivo**: login/logout funcional con Firebase Auth + session cookie + middleware de protección por rol.
- **Arquitectura**: `lib/firebase/client.ts`, `lib/firebase/admin.ts`, `app/api/auth/session/route.ts`, `middleware.ts`.
- **Colecciones**: `users/{uid}` (lectura del perfil/rol tras login).
- **Componentes**: `LoginForm`, `AuthProvider` (context de usuario/rol en cliente).
- **Pantallas**: `/login`, redirect automático según rol tras autenticar.
- **Riesgos**: desincronía entre custom claims y `users/{uid}` → mitigado escribiendo ambos atómicamente desde el mismo Route Handler.
- **Buenas prácticas**: session cookie httpOnly+secure, refresco de claims al cambiar de rol.
- **Criterios de aceptación**: un usuario no puede ver rutas de un rol distinto al suyo (verificado manualmente con 4 cuentas de prueba).

### Fase 3 — Sistema de Invitaciones
- **Objetivo**: generación y consumo de enlaces `/invite/{role}/{token}` que auto-asocian jerarquía sin selección manual.
- **Arquitectura**: `app/api/invites/route.ts` (crear), `app/api/invites/[token]/route.ts` (validar), `app/(public)/invite/[role]/[token]/page.tsx`.
- **Colecciones**: `invites/{token}`.
- **Componentes**: `InviteRegisterForm` (por rol), `InviteLinkCard` (copiar/compartir enlace).
- **Pantallas**: página de registro por invitación (una vista, 3 variantes de campos según rol).
- **Riesgos**: tokens reusados indefinidamente o compartidos fuera de la jerarquía → mitigado con expiración opcional y `usesRemaining` para invitaciones de un solo uso (admin/supervisor) vs. permanente (empleado, según PRD).
- **Buenas prácticas**: token generado server-side (`crypto.randomUUID()`), nunca predecible.
- **Criterios de aceptación**: registrarse vía enlace crea el usuario ya asociado a contrato/campo/supervisor sin ningún selector visible.

### Fase 4 — Gestión de Contratos
- **Objetivo**: CRUD de contratos por Super Admin con automatización de carpeta Drive + enlace de invitación de admin.
- **Arquitectura**: `app/api/contracts/route.ts` (+`[id]`), `lib/drive/folders.ts` (creación de carpeta raíz del contrato).
- **Colecciones**: `contracts`, `invites` (invitación de admin), `auditLogs`.
- **Componentes**: `ContractForm`, `ContractsTable`.
- **Pantallas**: `/super-admin/contracts`, `/super-admin/contracts/[id]`.
- **Riesgos**: fallo parcial (Firestore ok, Drive falla) → mitigado con creación de carpeta *lazy* (se resuelve/crea la primera vez que se necesita, no bloqueante en el alta) y reintentos idempotentes vía `ensureFolderPath`.
- **Buenas prácticas**: `number` de contrato único (validación server-side), estados controlados por enum.
- **Criterios de aceptación**: crear un contrato genera el registro, un `invites` de rol admin y un enlace copiable.

### Fase 5 — Gestión de Campos
- **Objetivo**: administrador crea campos dentro de su contrato, cada uno con enlace de invitación de supervisor.
- **Arquitectura**: `app/api/fields/route.ts`.
- **Colecciones**: `fields`, `invites`.
- **Componentes**: `FieldForm`, `FieldsList`.
- **Pantallas**: `/admin/fields`.
- **Riesgos**: un admin intenta crear campo en contrato ajeno → bloqueado por Security Rules + validación server-side contra `contractId` del claim.
- **Buenas prácticas**: nombre de campo único por contrato.
- **Criterios de aceptación**: campo creado queda listado solo para el admin de ese contrato.

### Fase 6 — Gestión de Usuarios (Supervisores y Empleados)
- **Objetivo**: supervisores se registran vía invitación de campo; generan enlace permanente de empleados; ambos gestionan su equipo.
- **Arquitectura**: `app/api/users/route.ts`, reutiliza sistema de invitaciones de Fase 3.
- **Colecciones**: `users`, `supervisors`, `employees`.
- **Componentes**: `EmployeesTable`, `InvitePermanentLinkCard`.
- **Pantallas**: `/supervisor/employees`, `/admin/supervisors`.
- **Riesgos**: enlace permanente de empleado filtrado fuera de la organización → aceptado por diseño (PRD lo define como permanente), mitigado mostrando siempre el nombre del campo/supervisor al que se asociará antes de registrarse, para detectar mal uso visualmente.
- **Buenas prácticas**: cédula como identificador único de negocio (índice único a nivel de aplicación).
- **Criterios de aceptación**: empleado registrado por el enlace aparece automáticamente bajo el supervisor/campo/contrato correctos.

### Fase 7 — Formulario de Ausentismo
- **Objetivo**: reemplazar el PDF físico por un formulario web equivalente en campos.
- **Arquitectura**: `app/(app)/employee/leave-requests/new/page.tsx`, `app/api/leave-requests/route.ts`.
- **Colecciones**: `leaveRequests` (estado `BORRADOR`→`ENVIADO`).
- **Componentes**: `LeaveRequestForm` (react-hook-form + zod), `LeaveRequestStatusBadge`.
- **Pantallas**: nuevo ausentismo, historial del empleado.
- **Riesgos**: pérdida de borrador al cerrar pestaña → mitigado guardando `BORRADOR` en Firestore en cada paso relevante, no solo al enviar.
- **Buenas prácticas**: validación de fechas (fin ≥ inicio), textos con límite de longitud.
- **Criterios de aceptación**: empleado completa y envía una solicitud, que aparece de inmediato como pendiente para su supervisor.

### Fase 8 — Firmas Digitales
- **Objetivo**: captura de firma de empleado y de supervisor dentro del flujo, sin imprimir nada.
- **Arquitectura**: componente cliente con `react-signature-canvas`, envío de la firma como PNG (dataURL) al Route Handler que la persiste.
- **Colecciones**: `leaveRequests.employeeSignature` / `.supervisorSignature`.
- **Componentes**: `SignaturePad` (reutilizable, con botón limpiar/confirmar).
- **Pantallas**: paso de firma dentro del formulario de ausentismo y dentro de la revisión del supervisor.
- **Riesgos**: firmas de gran tamaño infladas en Firestore → mitigado comprimiendo el canvas a PNG de bajo peso (recorte al bounding box del trazo) antes de guardar; el documento de Firestore guarda la imagen ya recortada en base64 corto o, si excede un umbral, se sube directo a Drive junto al PDF final.
- **Buenas prácticas**: exigir al menos un trazo antes de habilitar "Confirmar firma".
- **Criterios de aceptación**: no se puede aprobar/enviar sin firma válida capturada.

### Fase 9 — Generación Automática del PDF
- **Objetivo**: al llegar a `APROBADO`, generar automáticamente el PDF oficial con pdf-lib.
- **Arquitectura**: `lib/pdf/leaveRequestTemplate.ts` + `app/api/pdf/[leaveRequestId]/route.ts` (server-only, usa `pdf-lib` para maquetar datos + ambas firmas como imágenes embebidas).
- **Colecciones**: `leaveRequests.pdf`, transición a `PDF_GENERADO`.
- **Componentes**: `PdfPreviewButton`.
- **Pantallas**: vista de detalle de solicitud con estado y enlace de descarga una vez generado.
- **Riesgos**: generación duplicada por doble clic/reintento → mitigado con idempotencia (si `pdf.driveFileId` ya existe, no se regenera) y bloqueo optimista de estado.
- **Buenas prácticas**: plantilla PDF versionada (constante `TEMPLATE_VERSION`) para poder auditar qué formato generó cada documento.
- **Criterios de aceptación**: al aprobar y firmar, el PDF se genera automáticamente sin acción manual adicional.

### Fase 10 — Integración con Google Drive
- **Objetivo**: subir el PDF generado a la ruta de carpetas correcta, creando subcarpetas solo cuando falten.
- **Arquitectura**: `lib/drive/client.ts` (googleapis + Service Account JWT), `lib/drive/folders.ts`.
- **Colecciones**: `contracts.driveFolderId`, `fields.driveFolderPath` (cache de IDs resueltos).
- **Componentes**: ninguno de UI directo (backend); `DriveLinkButton` para abrir el archivo.
- **Pantallas**: enlaces "Ver PDF" en detalle de solicitud y en dashboards de administrador.
- **Riesgos**: límites de cuota de la Drive API con cientos de contratos → mitigado cacheando `folderId` resueltos y minimizando búsquedas (`files.list`) a solo la primera vez por combinación año/mes/campo.
- **Buenas prácticas**: nombres de archivo sin caracteres especiales (`slugify`), timeout y reintento único ante error transitorio de red.
- **Criterios de aceptación**: el PDF aparece en Drive en `Ausentismos/Contrato_{n}/{año}/{mes}/{campo}/archivo.pdf` sin intervención manual.

### Fase 11 — Centro de Actividad
- **Objetivo**: reemplazar el correo como canal de comunicación con un feed en tiempo real por rol.
- **Arquitectura**: `components/activity-center/*`, listeners `onSnapshot` en cliente, escritura server-side vía `lib/activity/log.ts` desde cada Route Handler relevante (Fases 4–10 emiten actividades).
- **Colecciones**: `activities`.
- **Componentes**: `ActivityFeed`, `PendingTasksPanel`, `QuickStats`, `QuickActions` (los 4 módulos del PRD, parametrizados por rol).
- **Pantallas**: panel de actividad integrado en cada dashboard (no una página aislada).
- **Riesgos**: feed que crece sin límite y ralentiza la UI → mitigado con paginación por cursor y `limit` inicial de 20.
- **Buenas prácticas**: un solo listener por vista, desuscripción en `useEffect` cleanup.
- **Criterios de aceptación**: una acción de un usuario (ej. aprobar) aparece en el feed del otro usuario relevante (ej. empleado) sin recargar la página.

### Fase 12 — Auditoría
- **Objetivo**: trazabilidad completa e inmutable de toda acción relevante del sistema.
- **Arquitectura**: `lib/audit/log.ts` invocado desde cada Route Handler mutante; captura de IP vía headers de la request.
- **Colecciones**: `auditLogs`.
- **Componentes**: `AuditLogTable` con filtros (usuario, acción, entidad, rango de fechas).
- **Pantallas**: `/super-admin/audit`.
- **Riesgos**: crecimiento no acotado de la colección → mitigado con índices por `contractId`+`createdAt` y paginación; nunca se borra (requisito del PRD), pero se puede archivar en frío más adelante si crece demasiado (fuera de alcance inicial).
- **Buenas prácticas**: `auditLogs` de solo escritura desde servidor, solo lectura desde `super-admin`.
- **Criterios de aceptación**: cada acción listada en la sección "Auditoría" del PRD queda registrada con usuario, acción, fecha/hora y entidad afectada.

### Fase 13 — Dashboards
- **Objetivo**: vista de inicio por rol con los indicadores definidos en el PRD.
- **Arquitectura**: Server Components que agregan datos (counts) vía queries Firestore filtradas por claims + client components para gráficos (recharts).
- **Colecciones**: lectura agregada de `contracts`, `leaveRequests`, `users`.
- **Componentes**: `StatCard`, `RecentActivityWidget`, tarjetas por rol descritas en el PRD.
- **Pantallas**: `/super-admin`, `/admin`, `/supervisor`, `/employee` (home de cada route group).
- **Riesgos**: contar documentos en el cliente en tiempo real es costoso a escala → mitigado con contadores agregados vía Firestore (`count()` aggregation queries) en vez de traer documentos completos.
- **Buenas prácticas**: mismos componentes de tarjeta reutilizados entre roles, solo cambia la data.
- **Criterios de aceptación**: cada rol ve exactamente los indicadores listados en el PRD para su rol, con datos reales del contrato correspondiente.

### Fase 14 — Reportes
- **Objetivo**: exportación y consulta agregada para administradores (histórico, filtros, export CSV/PDF resumen).
- **Arquitectura**: `app/api/reports/route.ts`, generación de CSV en servidor (stream) para exportaciones grandes.
- **Colecciones**: consultas sobre `leaveRequests` con filtros de fecha/campo/estado.
- **Componentes**: `ReportFilters`, `ReportTable`, `ExportButton`.
- **Pantallas**: `/admin/reports`.
- **Riesgos**: exportaciones grandes bloqueando el Route Handler → mitigado con límite de rango de fechas por exportación y streaming de respuesta.
- **Buenas prácticas**: mismo query builder tipado que dashboards, evitar lógica de filtros duplicada.
- **Criterios de aceptación**: administrador exporta un CSV de solicitudes de un rango de fechas y campo específico.

### Fase 15 — Optimización y Despliegue
- **Objetivo**: preparar la plataforma para producción en Vercel con cientos de contratos y miles de usuarios.
- **Arquitectura**: revisión de índices Firestore, caché de datos semi-estáticos (contratos/campos) con `unstable_cache`/tags, revisión de tamaño de bundle.
- **Colecciones**: verificación de todos los índices compuestos usados por las queries de fases anteriores.
- **Componentes**: N/A (tarea transversal de performance).
- **Pantallas**: N/A.
- **Riesgos**: cold starts de Route Handlers con Drive/PDF → mitigado manteniendo esas rutas en runtime Node.js (no Edge) y con timeouts explícitos.
- **Buenas prácticas**: variables de entorno separadas por ambiente (preview/production) en Vercel, revisión de Security Rules con el emulador de Firestore antes de cada release.
- **Criterios de aceptación**: `npm run build` sin warnings críticos, Lighthouse ≥ 90 en accesibilidad/performance en las pantallas principales, checklist de seguridad (sección 5) verificado.

---

## 9. Checklist de configuración manual (requiere acceso a tus propias cuentas)

Todo el código de las 15 fases está implementado en este repositorio. Lo único que falta y que **solo tú puedes hacer** (requiere tus propias cuentas de Google/Firebase/Vercel) está detallado en la sección final de la conversación / entrega. En resumen: crear el proyecto de Firebase (Auth + Firestore), crear un Service Account con la Drive API habilitada y compartirle la carpeta "Ausentismos", cargar las variables de entorno (local y en Vercel) y desplegar `firestore.rules` / `firestore.indexes.json`.
