"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { SignaturePad } from "@/components/signature/SignaturePad";
import { LeaveRequestDetailCard } from "@/components/leave-requests/LeaveRequestDetailCard";
import { CheckCircle2, XCircle } from "lucide-react";
import type { LeaveRequestView } from "@/lib/leaveRequests/viewModel";

interface ReviewPanelProps {
  request: LeaveRequestView;
  contractLabel: string;
  fieldLabel: string;
}

export function ReviewPanel({ request, contractLabel, fieldLabel }: ReviewPanelProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "reject" | "approve">("idle");
  const [rejectionReason, setRejectionReason] = useState("");
  const [supervisorPosition, setSupervisorPosition] = useState(`Supervisor ${fieldLabel}`);
  const [loading, setLoading] = useState(false);

  const canReview = request.status === "PENDIENTE_SUPERVISOR";

  async function submit(body: Record<string, unknown>) {
    setLoading(true);
    try {
      const response = await fetch(`/api/leave-requests/${request.id}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error ?? "Error al procesar la solicitud");
      if (json.warning) toast.warning(json.warning);
      else toast.success("Solicitud procesada correctamente");
      router.push("/supervisor/leave-requests");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al procesar la solicitud");
    } finally {
      setLoading(false);
    }
  }

  const idleActions =
    canReview && mode === "idle" ? (
      <div className="flex gap-2">
        <Button size="sm" onClick={() => setMode("approve")}>
          <CheckCircle2 className="size-4" />
          Aprobar
        </Button>
        <Button size="sm" variant="destructive" onClick={() => setMode("reject")}>
          <XCircle className="size-4" />
          Rechazar
        </Button>
      </div>
    ) : null;

  return (
    <div className="space-y-6">
      <LoadingOverlay
        open={loading}
        title={mode === "approve" ? "Firmando y generando el ausentismo" : "Rechazando solicitud"}
        description="Espera un momento, no cierres ni recargues esta ventana."
      />

      <LeaveRequestDetailCard
        request={request}
        contractLabel={contractLabel}
        fieldLabel={fieldLabel}
        actions={idleActions}
      />

      <Dialog
        open={canReview && mode === "approve"}
        onOpenChange={(open) => {
          if (!loading) setMode(open ? "approve" : "idle");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Firma para aprobar</DialogTitle>
            <DialogDescription>
              Con mi firma certifico que la información suministrada en el presente formato es
              veraz y que los documentos soporte adjuntos corresponden al motivo del ausentismo
              reportado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="supervisorPosition">Cargo</Label>
              <Input
                id="supervisorPosition"
                value={supervisorPosition}
                onChange={(e) => setSupervisorPosition(e.target.value)}
              />
            </div>
            <SignaturePad
              confirmLabel="Firmar y aprobar"
              onConfirm={(dataUrl) =>
                submit({
                  action: "approve",
                  supervisorPosition,
                  supervisorSignatureDataUrl: dataUrl,
                })
              }
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={canReview && mode === "reject"}
        onOpenChange={(open) => {
          if (!loading) setMode(open ? "reject" : "idle");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Motivo de rechazo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              rows={3}
              placeholder="Explica el motivo del rechazo"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
            <Button
              variant="destructive"
              className="w-full"
              disabled={loading || rejectionReason.trim().length < 3}
              onClick={() => submit({ action: "reject", rejectionReason })}
            >
              Confirmar rechazo
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
