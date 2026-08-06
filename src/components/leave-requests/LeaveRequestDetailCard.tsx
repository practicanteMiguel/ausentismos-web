import { LeaveRequestStatusBadge } from "@/components/leave-requests/LeaveRequestStatusBadge";
import { LeaveRequestPdfPreview } from "@/components/leave-requests/LeaveRequestPdfPreview";
import { ZoomableDocument } from "@/components/leave-requests/ZoomableDocument";
import type { LeaveRequestView } from "@/lib/leaveRequests/viewModel";

interface LeaveRequestDetailCardProps {
  request: LeaveRequestView;
  contractLabel: string;
  fieldLabel: string;
  actions?: React.ReactNode;
}

export function LeaveRequestDetailCard({
  request,
  contractLabel,
  fieldLabel,
  actions,
}: LeaveRequestDetailCardProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{request.employeeName}</h2>
        <LeaveRequestStatusBadge status={request.status} />
      </div>
      {request.rejectionReason && (
        <p className="text-sm text-destructive">Motivo de rechazo: {request.rejectionReason}</p>
      )}
      <ZoomableDocument actions={actions}>
        <LeaveRequestPdfPreview
          data={{
            fechaDiligenciamiento: request.createdAt,
            nombre: request.employeeName,
            cedula: request.employeeCedula,
            cargo: request.position,
            contrato: contractLabel,
            campo: fieldLabel,
            fechaInicio: request.startDate,
            fechaFin: request.endDate,
            horaInicio: request.startTime,
            horaFin: request.endTime,
            numDias: request.numDays,
            numHoras: request.numHours,
            isPaid: request.isPaid,
            selectedType: request.type,
            otherReasonText: request.otherReasonText ?? "",
            medicalNotifiedAt: request.medicalSupport?.notifiedAt ?? null,
            medicalMethod: request.medicalSupport?.method ?? null,
            nonMedicalSupportDescription: request.nonMedicalSupportDescription ?? "",
            employeeSignatureDataUrl: request.employeeSignature?.dataUrl ?? null,
            supervisorName: request.supervisorSignature?.signedByName ?? "",
            supervisorCedula: request.supervisorSignature?.signedByCedula ?? "",
            supervisorCargo: request.supervisorSignature?.position ?? "",
            supervisorSignatureDataUrl: request.supervisorSignature?.dataUrl ?? null,
          }}
        />
      </ZoomableDocument>
    </div>
  );
}
