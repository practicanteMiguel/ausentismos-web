"use client";

import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Eraser, PenLine, Upload, X } from "lucide-react";

interface SignaturePadProps {
  onConfirm: (dataUrl: string) => void;
  confirmLabel?: string;
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_IMAGE_DIMENSION = 800;

/**
 * Reescala y repinta la imagen cargada en un <canvas> para exportarla siempre como PNG: el
 * generador de PDF (leaveRequestTemplate.ts) solo sabe incrustar PNG (pdfDoc.embedPng), así que
 * una firma subida como JPG/WEBP/etc. rompería la generación si se guardara tal cual.
 */
async function fileToPngDataUrl(file: File): Promise<string> {
  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("El archivo no es una imagen válida"));
    img.src = rawDataUrl;
  });

  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo procesar la imagen");
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}

export function SignaturePad({ onConfirm, confirmLabel = "Confirmar firma" }: SignaturePadProps) {
  const padRef = useRef<SignatureCanvas>(null);
  const [mode, setMode] = useState<"draw" | "upload">("draw");
  const [hasStroke, setHasStroke] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  function handleClear() {
    padRef.current?.clear();
    setHasStroke(false);
  }

  function switchMode(next: "draw" | "upload") {
    setMode(next);
    handleClear();
    setUploadedImage(null);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("El archivo debe ser una imagen");
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error("La imagen no debe superar 5MB");
      return;
    }
    setProcessing(true);
    try {
      setUploadedImage(await fileToPngDataUrl(file));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cargar la imagen");
    } finally {
      setProcessing(false);
    }
  }

  function handleConfirm() {
    if (mode === "upload") {
      if (!uploadedImage) return;
      onConfirm(uploadedImage);
      return;
    }
    if (!padRef.current || padRef.current.isEmpty()) return;
    const dataUrl = padRef.current.getTrimmedCanvas().toDataURL("image/png");
    onConfirm(dataUrl);
  }

  const canConfirm = mode === "upload" ? !!uploadedImage : hasStroke;

  return (
    <div className="space-y-3">
      <div className="inline-flex rounded-lg border p-0.5">
        <button
          type="button"
          onClick={() => switchMode("draw")}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            mode === "draw"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <PenLine className="size-4" />
          Dibujar firma
        </button>
        <button
          type="button"
          onClick={() => switchMode("upload")}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            mode === "upload"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Upload className="size-4" />
          Subir imagen
        </button>
      </div>

      {mode === "draw" ? (
        <>
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
            <Button type="button" size="sm" onClick={handleConfirm} disabled={!canConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </>
      ) : (
        <>
          {uploadedImage ? (
            <div className="relative overflow-hidden rounded-md border bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element -- data URL, no aplica optimización de next/image */}
              <img src={uploadedImage} alt="Firma cargada" className="h-40 w-full object-contain" />
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="absolute top-2 right-2 bg-card"
                onClick={() => setUploadedImage(null)}
                aria-label="Quitar imagen"
              >
                <X className="size-4" />
              </Button>
            </div>
          ) : (
            <label className="flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed text-sm text-muted-foreground hover:border-ring hover:text-foreground">
              <Upload className="size-5" />
              {processing ? "Cargando..." : "Haz clic para subir una imagen de tu firma"}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={processing}
                onChange={handleFileChange}
              />
            </label>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" onClick={handleConfirm} disabled={!canConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
