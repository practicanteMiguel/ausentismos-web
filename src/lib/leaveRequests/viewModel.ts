import "server-only";
import type { LeaveRequest, LeaveRequestStatus, LeaveType, SupportMethod } from "@/types/domain";

/**
 * Subconjunto plano y serializable de LeaveRequest, con los Timestamp de Firestore Admin
 * (instancias de clase) ya convertidos a Date nativo. Server Components solo pueden pasar
 * objetos planos/built-ins a Client Components — nunca instancias de clase como Timestamp.
 */
export interface LeaveRequestView {
  id: string;
  status: LeaveRequestStatus;
  employeeName: string;
  employeeCedula: string;
  position: string;
  type: LeaveType;
  otherReasonText: string | null;
  startDate: Date;
  endDate: Date;
  startTime: string | null;
  endTime: string | null;
  numDays: number;
  numHours: number | null;
  isPaid: boolean;
  medicalSupport: { notifiedAt: Date; method: SupportMethod } | null;
  nonMedicalSupportDescription: string | null;
  rejectionReason: string | null;
  createdAt: Date;
  employeeSignature: { dataUrl: string; position: string } | null;
  supervisorSignature: {
    dataUrl: string;
    signedByName: string;
    signedByCedula: string;
    position: string;
  } | null;
}

export function toLeaveRequestView(r: LeaveRequest): LeaveRequestView {
  return {
    id: r.id,
    status: r.status,
    employeeName: r.employeeName,
    employeeCedula: r.employeeCedula,
    position: r.position,
    type: r.type,
    otherReasonText: r.otherReasonText,
    startDate: r.startDate.toDate(),
    endDate: r.endDate.toDate(),
    startTime: r.startTime,
    endTime: r.endTime,
    numDays: r.numDays,
    numHours: r.numHours,
    isPaid: r.isPaid,
    medicalSupport: r.medicalSupport
      ? { notifiedAt: r.medicalSupport.notifiedAt.toDate(), method: r.medicalSupport.method }
      : null,
    nonMedicalSupportDescription: r.nonMedicalSupportDescription,
    rejectionReason: r.rejectionReason,
    createdAt: r.createdAt.toDate(),
    employeeSignature: r.employeeSignature
      ? { dataUrl: r.employeeSignature.dataUrl, position: r.employeeSignature.position }
      : null,
    supervisorSignature: r.supervisorSignature
      ? {
          dataUrl: r.supervisorSignature.dataUrl,
          signedByName: r.supervisorSignature.signedByName,
          signedByCedula: r.supervisorSignature.signedByCedula,
          position: r.supervisorSignature.position,
        }
      : null,
  };
}
