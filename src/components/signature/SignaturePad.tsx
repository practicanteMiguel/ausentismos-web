"use client";

import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Eraser } from "lucide-react";

interface SignaturePadProps {
  onConfirm: (dataUrl: string) => void;
  confirmLabel?: string;
}

export function SignaturePad({ onConfirm, confirmLabel = "Confirmar firma" }: SignaturePadProps) {
  const padRef = useRef<SignatureCanvas>(null);
  const [hasStroke, setHasStroke] = useState(false);

  function handleClear() {
    padRef.current?.clear();
    setHasStroke(false);
  }

  function handleConfirm() {
    if (!padRef.current || padRef.current.isEmpty()) return;
    const dataUrl = padRef.current.getTrimmedCanvas().toDataURL("image/png");
    onConfirm(dataUrl);
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-md border bg-white">
        <SignatureCanvas
          ref={padRef}
          penColor="black"
          canvasProps={{ className: "w-full h-40 touch-none" }}
          onBegin={() => setHasStroke(true)}
        />
      </div>
      <div className="flex justify-between gap-2">
        <Button type="button" variant="outline" size="sm" onClick={handleClear}>
          <Eraser className="size-4" />
          Limpiar
        </Button>
        <Button type="button" size="sm" onClick={handleConfirm} disabled={!hasStroke}>
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}
