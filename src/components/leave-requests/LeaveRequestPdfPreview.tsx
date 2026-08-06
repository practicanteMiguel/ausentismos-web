import Image from "next/image";
import {
  LEAVE_TYPE_GROUPS,
  LEAVE_TYPE_LABEL,
  OTRA_LEAVE_TYPES,
  SUPPORT_METHOD_LABEL,
  type LeaveType,
  type SupportMethod,
} from "@/types/domain";

/**
 * "calendar" (default): fechas de solo-día (`<input type="date">`, guardadas como medianoche UTC) —
 * se formatean fijadas a UTC para que el día mostrado no dependa de la zona horaria del navegador.
 * "instant": momentos reales (ej. "ahora"), se formatean en la hora local del navegador.
 */
function formatDateEs(date: Date | null, mode: "calendar" | "instant" = "calendar"): string {
  if (!date) return "";
  return date.toLocaleDateString("es-CO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: mode === "calendar" ? "UTC" : undefined,
  });
}

export interface LeaveRequestPreviewData {
  fechaDiligenciamiento: Date;
  nombre: string;
  cedula: string;
  cargo: string;
  contrato: string;
  campo: string;
  fechaInicio: Date | null;
  fechaFin: Date | null;
  horaInicio: string | null;
  horaFin: string | null;
  numDias: number | null;
  numHoras: number | null;
  isPaid: boolean | null;
  selectedType: LeaveType | null;
  otherReasonText: string;
  medicalNotifiedAt: Date | null;
  medicalMethod: SupportMethod | null;
  nonMedicalSupportDescription: string;
  employeeSignatureDataUrl: string | null;
  supervisorName: string;
  supervisorCedula: string;
  supervisorCargo: string;
  supervisorSignatureDataUrl: string | null;
}

function Field({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={`flex items-baseline gap-1 ${className ?? ""}`}>
      <span className="shrink-0 font-semibold">{label}</span>
      <span className="min-w-8 flex-1 border-b border-black px-1 leading-tight wrap-break">
        {value || " "}
      </span>
    </div>
  );
}

function SectionBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-black bg-neutral-200 px-2 py-0.5 text-center text-[11px] font-bold uppercase">
      {children}
    </div>
  );
}

export function LeaveRequestPdfPreview({ data }: { data: LeaveRequestPreviewData }) {
  const group = data.selectedType
    ? LEAVE_TYPE_GROUPS.find((g) => g.types.includes(data.selectedType as LeaveType))?.group
    : null;
  const isMedical = group === "MEDICO";
  const isOtherSupport = group === "NO_MEDICO" || group === "EXTRALEGAL";

  return (
    <div className="mx-auto w-full max-w-180 border border-black bg-white text-[10px] text-black">
      {/* Encabezado */}
      <div className="grid grid-cols-[140px_1fr_180px] border-b border-black">
        <div className="row-span-3 flex items-center justify-center border-r border-black p-2">
          <Image
            src="/assets/img/logo-sas.png"
            alt="SAS Servicios Asociados"
            width={120}
            height={50}
            className="h-auto w-full"
          />
        </div>
        <div className="border-b border-r border-black px-2 py-1 text-center font-bold">GESTIÓN HUMANA</div>
        <div className="border-b border-black px-2 py-1">
          <span className="font-bold">CÓDIGO:</span> GH-FO-37
        </div>
        <div className="border-b border-r border-black px-2 py-1 text-center font-bold">FORMATO</div>
        <div className="border-b border-black px-2 py-1">
          <span className="font-bold">VIGENCIA:</span> 05/08/2026
        </div>
        <div className="border-r border-black px-2 py-1 text-center font-bold">
          SOLICITUD AUSENTISMO LABORAL
        </div>
        <div className="px-2 py-1">
          <span className="font-bold">VERSIÓN:</span> 5
        </div>
      </div>

      {/* Información general */}
      <SectionBar>Información general</SectionBar>
      <div className="space-y-1 border-b border-black p-2">
        <Field
          label="Fecha de diligenciamiento:"
          value={formatDateEs(data.fechaDiligenciamiento, "instant")}
        />
        <div className="grid grid-cols-2 gap-2">
          <Field label="Nombre:" value={data.nombre} />
          <Field label="CC:" value={data.cedula} />
        </div>
        <Field label="Cargo:" value={data.cargo} />
        <div className="grid grid-cols-2 gap-2">
          <Field label="Contrato:" value={data.contrato} />
          <Field label="Campo:" value={data.campo} />
        </div>
      </div>

      {/* Fechas */}
      <div className="space-y-1 border-b border-black p-2">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Fecha de inicio:" value={formatDateEs(data.fechaInicio)} />
          <Field label="Hora de inicio:" value={data.horaInicio ?? ""} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Fecha de finalización:" value={formatDateEs(data.fechaFin)} />
          <Field label="Hora de finalización:" value={data.horaFin ?? ""} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="No. días:" value={data.numDias != null ? String(data.numDias) : ""} />
          <Field label="No. de horas:" value={data.numHoras != null ? String(data.numHoras) : ""} />
        </div>
      </div>

      {/* Remunerado */}
      <div className="flex items-center gap-4 border-b border-black p-2 font-semibold">
        <span>REMUNERADO:</span>
        <span>SI {data.isPaid === true ? "☒" : "☐"}</span>
        <span>NO {data.isPaid === false ? "☒" : "☐"}</span>
      </div>

      {/* Motivo */}
      <SectionBar>Motivo de ausentismo</SectionBar>
      <p className="border-b border-black px-2 py-1 text-[9px] italic">
        Marque con una (X) la casilla correspondiente al motivo de su ausentismo. Seleccione
        únicamente la opción que describa la causa principal de la ausencia.
      </p>
      <div className="grid grid-cols-3 border-b border-black">
        {LEAVE_TYPE_GROUPS.map((g, gi) => (
          <div key={g.group} className={gi > 0 ? "border-l border-black" : ""}>
            {g.types.map((t) => (
              <div key={t} className="flex items-center gap-1 border-b border-black/30 px-1.5 py-0.5 last:border-b-0">
                <span>{data.selectedType === t ? "☒" : "☐"}</span>
                <span>{LEAVE_TYPE_LABEL[t]}</span>
              </div>
            ))}
            {OTRA_LEAVE_TYPES.includes(g.types[g.types.length - 1]) && data.selectedType === g.types[g.types.length - 1] && (
              <div className="border-t border-black/30 px-1.5 py-0.5">
                <span className="border-b border-black">{data.otherReasonText || " "}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Soporte origen médico */}
      {isMedical && (
        <>
          <SectionBar>Documento soporte origen médico</SectionBar>
          <div className="space-y-1 border-b border-black p-2">
            <Field label="Fecha de notificación:" value={formatDateEs(data.medicalNotifiedAt)} />
            <div className="flex gap-4">
              <span>
                {data.medicalMethod === "CORREO_ELECTRONICO" ? "☒" : "☐"}{" "}
                {SUPPORT_METHOD_LABEL.CORREO_ELECTRONICO}
              </span>
              <span>
                {data.medicalMethod === "RADICADO_PRESENCIAL" ? "☒" : "☐"}{" "}
                {SUPPORT_METHOD_LABEL.RADICADO_PRESENCIAL}
              </span>
            </div>
          </div>
        </>
      )}

      {/* Soporte no médico / extralegal */}
      {isOtherSupport && (
        <>
          <SectionBar>Soporte origen no médico - origen extralegal</SectionBar>
          <div className="min-h-12 border-b border-black p-2 whitespace-pre-wrap">
            {data.nonMedicalSupportDescription || " "}
          </div>
        </>
      )}

      {/* Firmas */}
      <div className="grid grid-cols-2">
        <SectionBar>Ausentismo solicitado por:</SectionBar>
        <div className="border-b border-l border-black bg-neutral-200 px-2 py-0.5 text-center text-[11px] font-bold uppercase">
          Autorizado por:
        </div>

        <div className="space-y-1.5 border-r border-black p-2">
          <div className="flex h-10 items-end border-b border-black">
            {data.employeeSignatureDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.employeeSignatureDataUrl} alt="Firma empleado" className="h-9" />
            )}
          </div>
          <p className="text-[9px]">Firma</p>
          <Field label="Nombre completo:" value={data.nombre} />
          <Field label="Cédula:" value={data.cedula} />
          <Field label="Cargo:" value={data.cargo} />
        </div>
        <div className="space-y-1.5 p-2">
          <div className="flex h-10 items-end border-b border-black">
            {data.supervisorSignatureDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.supervisorSignatureDataUrl} alt="Firma supervisor" className="h-9" />
            )}
          </div>
          <p className="text-[9px]">Firma</p>
          <Field label="Nombre completo:" value={data.supervisorName} />
          <Field label="Cédula:" value={data.supervisorCedula} />
          <Field label="Cargo:" value={data.supervisorCargo} />
        </div>
      </div>
      <p className="border-t border-black p-2 text-[9px] font-semibold">
        Con mi firma certifico que la información suministrada en el presente formato es veraz y
        que los documentos soporte adjuntos corresponden al motivo del ausentismo reportado.
      </p>
    </div>
  );
}
