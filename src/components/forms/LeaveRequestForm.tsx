"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignaturePad } from "@/components/signature/SignaturePad";
import {
  LeaveRequestPdfPreview,
  type LeaveRequestPreviewData,
} from "@/components/leave-requests/LeaveRequestPdfPreview";
import { ZoomableDocument } from "@/components/leave-requests/ZoomableDocument";
import { calcLeaveDays, calcLeaveHours } from "@/lib/leaveRequests/calc";
import {
  LEAVE_TYPE_GROUPS,
  LEAVE_TYPE_GROUP,
  LEAVE_TYPE_LABEL,
  LEAVE_ORIGIN_GROUP_LABEL,
  OTRA_LEAVE_TYPES,
  SUPPORT_METHOD_LABEL,
  type LeaveType,
  type SupportMethod,
} from "@/types/domain";

interface LeaveRequestFormProps {
  employeeName: string;
  employeeCedula: string;
  contractLabel: string;
  fieldLabel: string;
}

export function LeaveRequestForm({
  employeeName,
  employeeCedula,
  contractLabel,
  fieldLabel,
}: LeaveRequestFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "signature">("form");
  const [loading, setLoading] = useState(false);

  const [cargo, setCargo] = useState("");
  const [type, setType] = useState<LeaveType | "">("");
  const [otherReasonText, setOtherReasonText] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isPaid, setIsPaid] = useState(false);
  const [medicalNotifiedAt, setMedicalNotifiedAt] = useState("");
  const [medicalMethod, setMedicalMethod] = useState<SupportMethod | "">("");
  const [nonMedicalSupportDescription, setNonMedicalSupportDescription] = useState("");

  const group = type ? LEAVE_TYPE_GROUP[type] : null;
  const isMedical = group === "MEDICO";
  const isOtherSupport = group === "NO_MEDICO" || group === "EXTRALEGAL";
  const isOtra = type ? OTRA_LEAVE_TYPES.includes(type) : false;

  const numDays =
    startDate && endDate ? calcLeaveDays(new Date(startDate), new Date(endDate)) : null;
  const numHours = numDays != null ? calcLeaveHours(numDays, startTime || null, endTime || null) : null;

  function handleStartDateChange(value: string) {
    setStartDate(value);
    if (value && endDate && endDate < value) setEndDate(value);
  }

  function validate(): string | null {
    if (!cargo.trim()) return "Ingresa tu cargo";
    if (!type) return "Selecciona el motivo del ausentismo";
    if (isOtra && !otherReasonText.trim()) return "Especifica el motivo en “Otra ¿Cuál?”";
    if (!startDate || !endDate) return "Selecciona las fechas de inicio y fin";
    if (new Date(endDate) < new Date(startDate)) {
      return "La fecha fin no puede ser anterior a la fecha inicio";
    }
    if (isMedical) {
      if (!medicalNotifiedAt) return "Ingresa la fecha de notificación";
      if (!medicalMethod) return "Selecciona el medio de notificación";
    }
    if (isOtherSupport && !nonMedicalSupportDescription.trim()) {
      return "Describe los documentos que soportan este ausentismo";
    }
    return null;
  }

  function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }
    setStep("signature");
  }

  async function handleSign(dataUrl: string) {
    setLoading(true);
    try {
      const response = await fetch("/api/leave-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          position: cargo,
          type,
          otherReasonText: isOtra ? otherReasonText : null,
          startDate,
          endDate,
          startTime: startTime || null,
          endTime: endTime || null,
          isPaid,
          medicalNotifiedAt: isMedical ? medicalNotifiedAt : null,
          medicalMethod: isMedical ? medicalMethod : null,
          nonMedicalSupportDescription: isOtherSupport ? nonMedicalSupportDescription : null,
          employeeSignatureDataUrl: dataUrl,
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error ?? "Error al enviar la solicitud");
      toast.success("Solicitud enviada a tu supervisor");
      router.push("/employee/leave-requests");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al enviar la solicitud");
      setStep("form");
    } finally {
      setLoading(false);
    }
  }

  const previewData: LeaveRequestPreviewData = {
    fechaDiligenciamiento: new Date(),
    nombre: employeeName,
    cedula: employeeCedula,
    cargo,
    contrato: contractLabel,
    campo: fieldLabel,
    fechaInicio: startDate ? new Date(startDate) : null,
    fechaFin: endDate ? new Date(endDate) : null,
    horaInicio: startTime || null,
    horaFin: endTime || null,
    numDias: numDays,
    numHoras: numHours,
    isPaid,
    selectedType: type || null,
    otherReasonText,
    medicalNotifiedAt: medicalNotifiedAt ? new Date(medicalNotifiedAt) : null,
    medicalMethod: medicalMethod || null,
    nonMedicalSupportDescription,
    employeeSignatureDataUrl: null,
    supervisorName: "",
    supervisorCedula: "",
    supervisorCargo: "",
    supervisorSignatureDataUrl: null,
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
      <div>
        {step === "form" ? (
          <Card>
            <CardHeader>
              <CardTitle>Nuevo ausentismo</CardTitle>
              <CardDescription>
                Completa todos los campos; se irán reflejando en la vista previa del PDF a la derecha.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleContinue} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground">Información general</h3>
                  <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                    <div>
                      <Label className="text-muted-foreground">Nombre</Label>
                      <p className="font-medium">{employeeName}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Cédula</Label>
                      <p className="font-medium">{employeeCedula}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Contrato</Label>
                      <p className="font-medium">{contractLabel}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Campo</Label>
                      <p className="font-medium">{fieldLabel}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cargo">Cargo</Label>
                    <Input id="cargo" required value={cargo} onChange={(e) => setCargo(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground">Fechas</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="startDate">Fecha de inicio</Label>
                      <Input
                        id="startDate"
                        type="date"
                        required
                        value={startDate}
                        onChange={(e) => handleStartDateChange(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endDate">Fecha de finalización</Label>
                      <Input
                        id="endDate"
                        type="date"
                        required
                        min={startDate || undefined}
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="startTime">Hora de inicio (opcional)</Label>
                      <Input
                        id="startTime"
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endTime">Hora de finalización (opcional)</Label>
                      <Input
                        id="endTime"
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                    <span>No. días: <strong className="text-foreground">{numDays ?? "—"}</strong></span>
                    <span>No. horas: <strong className="text-foreground">{numHours ?? "—"}</strong></span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={isPaid} onCheckedChange={setIsPaid} />
                    <Label>{isPaid ? "Remunerado: Sí" : "Remunerado: No"}</Label>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground">Motivo de ausentismo</h3>
                  <p className="text-xs text-muted-foreground">
                    Selecciona únicamente la opción que describa la causa principal.
                  </p>
                  <RadioGroup value={type} onValueChange={(v) => setType(v as LeaveType)}>
                    {LEAVE_TYPE_GROUPS.map((g) => (
                      <div key={g.group} className="space-y-2 rounded-md border p-3">
                        <p className="text-xs font-semibold uppercase text-muted-foreground">
                          {LEAVE_ORIGIN_GROUP_LABEL[g.group]}
                        </p>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {g.types.map((t) => (
                            <label key={t} className="flex items-center gap-2 text-sm">
                              <RadioGroupItem value={t} />
                              {LEAVE_TYPE_LABEL[t]}
                            </label>
                          ))}
                        </div>
                        {OTRA_LEAVE_TYPES.includes(g.types[g.types.length - 1]) &&
                          type === g.types[g.types.length - 1] && (
                            <Input
                              placeholder="Especifica el motivo"
                              value={otherReasonText}
                              onChange={(e) => setOtherReasonText(e.target.value)}
                            />
                          )}
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                {isMedical && (
                  <div className="space-y-4 rounded-md border p-3">
                    <h3 className="text-sm font-semibold text-muted-foreground">
                      Documento soporte origen médico
                    </h3>
                    <div className="space-y-2">
                      <Label htmlFor="medicalNotifiedAt">Fecha de notificación</Label>
                      <Input
                        id="medicalNotifiedAt"
                        type="date"
                        value={medicalNotifiedAt}
                        onChange={(e) => setMedicalNotifiedAt(e.target.value)}
                      />
                    </div>
                    <RadioGroup
                      value={medicalMethod}
                      onValueChange={(v) => setMedicalMethod(v as SupportMethod)}
                      className="flex flex-wrap gap-x-6 gap-y-2"
                    >
                      {(Object.keys(SUPPORT_METHOD_LABEL) as SupportMethod[]).map((m) => (
                        <label key={m} className="flex items-center gap-2 text-sm">
                          <RadioGroupItem value={m} />
                          {SUPPORT_METHOD_LABEL[m]}
                        </label>
                      ))}
                    </RadioGroup>
                  </div>
                )}

                {isOtherSupport && (
                  <div className="space-y-2 rounded-md border p-3">
                    <h3 className="text-sm font-semibold text-muted-foreground">
                      Soporte origen no médico / extralegal
                    </h3>
                    <Label htmlFor="nonMedicalSupportDescription">
                      Menciona los nombres de los archivos que soportan este ausentismo
                    </Label>
                    <Textarea
                      id="nonMedicalSupportDescription"
                      rows={3}
                      value={nonMedicalSupportDescription}
                      onChange={(e) => setNonMedicalSupportDescription(e.target.value)}
                    />
                  </div>
                )}

                <Button type="submit" className="w-full">
                  Continuar a firma
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Firma tu solicitud</CardTitle>
              <CardDescription>
                Con mi firma certifico que la información suministrada en el presente formato es
                veraz y que los documentos soporte adjuntos corresponden al motivo del ausentismo
                reportado.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SignaturePad
                onConfirm={handleSign}
                confirmLabel={loading ? "Enviando..." : "Firmar y enviar"}
              />
              <Button variant="ghost" size="sm" onClick={() => setStep("form")} disabled={loading}>
                Volver a editar
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="lg:sticky lg:top-6 lg:self-start">
        <p className="mb-2 text-sm font-medium text-muted-foreground">Vista previa del PDF</p>
        <ZoomableDocument>
          <LeaveRequestPdfPreview data={previewData} />
        </ZoomableDocument>
      </div>
    </div>
  );
}
