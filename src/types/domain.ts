/**
 * Estructura mínima compartida por firebase-admin.Timestamp (servidor) y
 * firebase.Timestamp (cliente), para que los tipos de dominio no dependan de un SDK en particular.
 */
export interface Timestamp {
  toDate(): Date;
  seconds: number;
  nanoseconds: number;
}

export type Role = "super-admin" | "admin" | "supervisor" | "employee";

export type ContractStatus = "ACTIVO" | "VENCIDO" | "SUSPENDIDO";

export type LeaveRequestStatus =
  | "BORRADOR"
  | "ENVIADO"
  | "PENDIENTE_SUPERVISOR"
  | "RECHAZADO"
  | "APROBADO"
  | "PDF_GENERADO"
  | "FINALIZADO";

export const LEAVE_REQUEST_STATUS_LABEL: Record<LeaveRequestStatus, string> = {
  BORRADOR: "Borrador",
  ENVIADO: "Enviado",
  PENDIENTE_SUPERVISOR: "Pendiente de supervisor",
  RECHAZADO: "Rechazado",
  APROBADO: "Aprobado",
  PDF_GENERADO: "PDF generado",
  FINALIZADO: "Finalizado",
};

// Taxonomía de motivos de ausentismo, tomada tal cual del formato físico oficial
// (GH-FO-37 "Solicitud Ausentismo Laboral"). Cada motivo pertenece a exactamente un
// "origen", que determina qué sección de soporte documental aplica en el formulario y el PDF.
export type LeaveOriginGroup = "MEDICO" | "NO_MEDICO" | "EXTRALEGAL";

export const LEAVE_ORIGIN_GROUP_LABEL: Record<LeaveOriginGroup, string> = {
  MEDICO: "Origen médico",
  NO_MEDICO: "Origen no médico",
  EXTRALEGAL: "Origen extralegal",
};

export type LeaveType =
  // Origen médico
  | "ENFERMEDAD_GENERAL"
  | "ACCIDENTE_TRABAJO"
  | "ACCIDENTE_TRANSITO"
  | "TERAPIAS"
  | "PROCEDIMIENTO_QUIRURGICO"
  | "LICENCIA_MATERNIDAD"
  | "LICENCIA_PATERNIDAD"
  | "CITA_MEDICA_PROGRAMADA"
  | "TRATAMIENTO_MEDICO"
  | "ENFERMEDAD_LABORAL"
  | "OTRA_MEDICO"
  // Origen no médico
  | "PERMISO_PERSONAL"
  | "CALAMIDAD_DOMESTICA"
  | "LICENCIA_LUTO"
  | "COMPENSATORIO"
  | "VACACIONES"
  | "PERMISO_ESTUDIO"
  | "PERMISO_SINDICAL"
  | "PROGRAMA_BIENESTAR"
  | "OTRA_NO_MEDICO"
  // Origen extralegal
  | "FALTA_INJUSTIFICADA"
  | "SUSPENSION_FALTA_DISCIPLINARIA"
  | "PRIVACION_LIBERTAD"
  | "ABANDONO_PUESTO"
  | "EMBRIAGUEZ"
  | "CITACIONES_JUDICIALES"
  | "CITACIONES_ADMINISTRATIVAS"
  | "OTRA_EXTRALEGAL";

export const LEAVE_TYPE_LABEL: Record<LeaveType, string> = {
  ENFERMEDAD_GENERAL: "Enfermedad general",
  ACCIDENTE_TRABAJO: "Accidente de trabajo",
  ACCIDENTE_TRANSITO: "Accidente de tránsito",
  TERAPIAS: "Terapias",
  PROCEDIMIENTO_QUIRURGICO: "Procedimiento quirúrgico",
  LICENCIA_MATERNIDAD: "Licencia maternidad",
  LICENCIA_PATERNIDAD: "Licencia paternidad",
  CITA_MEDICA_PROGRAMADA: "Cita médica programada",
  TRATAMIENTO_MEDICO: "Tratamiento médico",
  ENFERMEDAD_LABORAL: "Enfermedad laboral",
  OTRA_MEDICO: "Otra ¿Cuál?",
  PERMISO_PERSONAL: "Permiso personal",
  CALAMIDAD_DOMESTICA: "Calamidad doméstica",
  LICENCIA_LUTO: "Licencia por luto",
  COMPENSATORIO: "Compensatorio",
  VACACIONES: "Vacaciones",
  PERMISO_ESTUDIO: "Permiso para estudio",
  PERMISO_SINDICAL: "Permiso sindical",
  PROGRAMA_BIENESTAR: "Programa de bienestar",
  OTRA_NO_MEDICO: "Otra ¿Cuál?",
  FALTA_INJUSTIFICADA: "Falta injustificada",
  SUSPENSION_FALTA_DISCIPLINARIA: "Suspensión o falta disciplinaria",
  PRIVACION_LIBERTAD: "Privación de la libertad",
  ABANDONO_PUESTO: "Abandono del puesto de trabajo",
  EMBRIAGUEZ: "Embriaguez",
  CITACIONES_JUDICIALES: "Citaciones judiciales",
  CITACIONES_ADMINISTRATIVAS: "Citaciones administrativas",
  OTRA_EXTRALEGAL: "Otra ¿Cuál?",
};

export const LEAVE_TYPE_GROUP: Record<LeaveType, LeaveOriginGroup> = {
  ENFERMEDAD_GENERAL: "MEDICO",
  ACCIDENTE_TRABAJO: "MEDICO",
  ACCIDENTE_TRANSITO: "MEDICO",
  TERAPIAS: "MEDICO",
  PROCEDIMIENTO_QUIRURGICO: "MEDICO",
  LICENCIA_MATERNIDAD: "MEDICO",
  LICENCIA_PATERNIDAD: "MEDICO",
  CITA_MEDICA_PROGRAMADA: "MEDICO",
  TRATAMIENTO_MEDICO: "MEDICO",
  ENFERMEDAD_LABORAL: "MEDICO",
  OTRA_MEDICO: "MEDICO",
  PERMISO_PERSONAL: "NO_MEDICO",
  CALAMIDAD_DOMESTICA: "NO_MEDICO",
  LICENCIA_LUTO: "NO_MEDICO",
  COMPENSATORIO: "NO_MEDICO",
  VACACIONES: "NO_MEDICO",
  PERMISO_ESTUDIO: "NO_MEDICO",
  PERMISO_SINDICAL: "NO_MEDICO",
  PROGRAMA_BIENESTAR: "NO_MEDICO",
  OTRA_NO_MEDICO: "NO_MEDICO",
  FALTA_INJUSTIFICADA: "EXTRALEGAL",
  SUSPENSION_FALTA_DISCIPLINARIA: "EXTRALEGAL",
  PRIVACION_LIBERTAD: "EXTRALEGAL",
  ABANDONO_PUESTO: "EXTRALEGAL",
  EMBRIAGUEZ: "EXTRALEGAL",
  CITACIONES_JUDICIALES: "EXTRALEGAL",
  CITACIONES_ADMINISTRATIVAS: "EXTRALEGAL",
  OTRA_EXTRALEGAL: "EXTRALEGAL",
};

export const LEAVE_TYPE_GROUPS: { group: LeaveOriginGroup; types: LeaveType[] }[] = [
  {
    group: "MEDICO",
    types: [
      "ENFERMEDAD_GENERAL",
      "ACCIDENTE_TRABAJO",
      "ACCIDENTE_TRANSITO",
      "TERAPIAS",
      "PROCEDIMIENTO_QUIRURGICO",
      "LICENCIA_MATERNIDAD",
      "LICENCIA_PATERNIDAD",
      "CITA_MEDICA_PROGRAMADA",
      "TRATAMIENTO_MEDICO",
      "ENFERMEDAD_LABORAL",
      "OTRA_MEDICO",
    ],
  },
  {
    group: "NO_MEDICO",
    types: [
      "PERMISO_PERSONAL",
      "CALAMIDAD_DOMESTICA",
      "LICENCIA_LUTO",
      "COMPENSATORIO",
      "VACACIONES",
      "PERMISO_ESTUDIO",
      "PERMISO_SINDICAL",
      "PROGRAMA_BIENESTAR",
      "OTRA_NO_MEDICO",
    ],
  },
  {
    group: "EXTRALEGAL",
    types: [
      "FALTA_INJUSTIFICADA",
      "SUSPENSION_FALTA_DISCIPLINARIA",
      "PRIVACION_LIBERTAD",
      "ABANDONO_PUESTO",
      "EMBRIAGUEZ",
      "CITACIONES_JUDICIALES",
      "CITACIONES_ADMINISTRATIVAS",
      "OTRA_EXTRALEGAL",
    ],
  },
];

export const OTRA_LEAVE_TYPES: LeaveType[] = ["OTRA_MEDICO", "OTRA_NO_MEDICO", "OTRA_EXTRALEGAL"];

export type SupportMethod = "CORREO_ELECTRONICO" | "RADICADO_PRESENCIAL";

export const SUPPORT_METHOD_LABEL: Record<SupportMethod, string> = {
  CORREO_ELECTRONICO: "Correo electrónico",
  RADICADO_PRESENCIAL: "Radicado presencial",
};

export interface MedicalSupport {
  notifiedAt: Timestamp;
  method: SupportMethod;
}

export interface Contract {
  id: string;
  number: string;
  name: string;
  startDate: Timestamp;
  endDate: Timestamp;
  status: ContractStatus;
  driveFolderId: string | null;
  createdAt: Timestamp;
  createdBy: string;
}

export type FieldStatus = "ACTIVO" | "INACTIVO";

export interface FieldDoc {
  id: string;
  contractId: string;
  name: string;
  status: FieldStatus;
  driveFolderId: string | null;
  createdAt: Timestamp;
  createdBy: string;
}

export type UserStatus = "ACTIVO" | "INACTIVO";

export interface UserDoc {
  id: string; // uid
  role: Role;
  contractId: string | null; // null only for super-admin
  fieldId: string | null;
  supervisorId: string | null;
  name: string;
  email: string;
  cedula: string | null;
  status: UserStatus;
  createdAt: Timestamp;
}

export type InviteRole = Extract<Role, "admin" | "supervisor" | "employee">;

export interface Invite {
  token: string;
  role: InviteRole;
  contractId: string;
  fieldId: string | null;
  supervisorId: string | null;
  createdBy: string;
  createdAt: Timestamp;
  expiresAt: Timestamp | null;
  usesRemaining: number | null; // null = ilimitado (enlace permanente de empleado)
  usesCount: number;
  revoked: boolean;
}

export interface SignatureData {
  dataUrl: string;
  signedAt: Timestamp;
  signedByUid: string;
  signedByName: string;
  signedByCedula: string;
  /** Cargo del firmante en el momento de firmar (ej. "Auxiliar de campo", "Supervisor Campo Norte"). */
  position: string;
}

export interface LeaveRequestHistoryEntry {
  status: LeaveRequestStatus;
  at: Timestamp;
  byUid: string;
  byName: string;
  note?: string;
}

export interface LeaveRequestPdf {
  driveFileId: string;
  webViewLink: string;
  generatedAt: Timestamp;
  templateVersion: number;
}

export interface LeaveRequest {
  id: string;
  contractId: string;
  fieldId: string;
  supervisorId: string;
  employeeId: string;
  employeeName: string;
  employeeCedula: string;
  /** Cargo del empleado, capturado en el formulario (no se asume fijo en el perfil). */
  position: string;
  type: LeaveType;
  /** Solo aplica cuando type pertenece al grupo OTRA_* ("Otra ¿Cuál?"). */
  otherReasonText: string | null;
  startDate: Timestamp;
  endDate: Timestamp;
  /** Hora "HH:mm", opcional — si se da una, no implica que la otra sea obligatoria a nivel de tipo. */
  startTime: string | null;
  endTime: string | null;
  /** Calculados en servidor a partir de las fechas/horas, nunca confiados del cliente. */
  numDays: number;
  numHours: number | null;
  isPaid: boolean;
  /** Obligatorio solo si LEAVE_TYPE_GROUP[type] === 'MEDICO'. */
  medicalSupport: MedicalSupport | null;
  /** Obligatorio solo si LEAVE_TYPE_GROUP[type] es 'NO_MEDICO' o 'EXTRALEGAL'. */
  nonMedicalSupportDescription: string | null;
  status: LeaveRequestStatus;
  employeeSignature: SignatureData | null;
  supervisorSignature: SignatureData | null;
  rejectionReason: string | null;
  pdf: LeaveRequestPdf | null;
  history: LeaveRequestHistoryEntry[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type ActivityType =
  | "LEAVE_REQUEST_CREATED"
  | "LEAVE_REQUEST_SUBMITTED"
  | "LEAVE_REQUEST_APPROVED"
  | "LEAVE_REQUEST_REJECTED"
  | "PDF_GENERATED"
  | "PDF_DOWNLOADED"
  | "CONTRACT_CREATED"
  | "FIELD_CREATED"
  | "USER_REGISTERED";

export interface Activity {
  id: string;
  contractId: string | null;
  fieldId: string | null;
  targetUserIds: string[];
  actorUid: string;
  actorName: string;
  type: ActivityType;
  title: string;
  description: string;
  relatedEntity: { type: string; id: string } | null;
  createdAt: Timestamp;
  readBy: Record<string, Timestamp>;
}

export type AuditAction =
  | "LOGIN"
  | "USER_REGISTERED"
  | "CONTRACT_CREATED"
  | "FIELD_CREATED"
  | "SUPERVISOR_CREATED"
  | "EMPLOYEE_CREATED"
  | "LEAVE_REQUEST_CREATED"
  | "EMPLOYEE_SIGNED"
  | "SUPERVISOR_SIGNED"
  | "LEAVE_REQUEST_APPROVED"
  | "LEAVE_REQUEST_REJECTED"
  | "PDF_GENERATED"
  | "PDF_DOWNLOADED"
  | "PASSWORD_RESET";

export interface AuditLog {
  id: string;
  contractId: string | null;
  actorUid: string;
  actorName: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: Timestamp;
  metadata: Record<string, unknown>;
}

export interface AuthClaims {
  role: Role;
  contractId: string | null;
  fieldId: string | null;
  supervisorId: string | null;
}
