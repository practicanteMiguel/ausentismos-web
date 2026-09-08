import Link from "next/link";
import { LeaveRequestStatusBadge } from "@/components/leave-requests/LeaveRequestStatusBadge";
import { LeaveRequestPdfPreview } from "@/components/leave-requests/LeaveRequestPdfPreview";
import { ZoomableDocument } from "@/components/leave-requests/ZoomableDocument";
import { FileText, Image as ImageIcon, Paperclip } from "lucide-react";
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
      {request.supportFiles.length > 0 && (
        <div className="space-y-1.5 rounded-md border p-3">
          <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <Paperclip className="size-4" />
            Documentos de soporte
          </p>
          <ul className="space-y-1">
            {request.supportFiles.map((file) => {
              const Icon = file.mimeType === "application/pdf" ? FileText : ImageIcon;
              return (
                <li key={file.driveFileId}>
                  <Link
                    href={`/api/leave-requests/${request.id}/support-files/${file.driveFileId}`}
                    target="_blank"
                    className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="truncate">{file.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
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
