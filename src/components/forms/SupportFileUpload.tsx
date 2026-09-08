"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FileText, Image as ImageIcon, Paperclip, X } from "lucide-react";

export interface SupportFileValue {
  name: string;
  mimeType: string;
  dataUrl: string;
}

interface SupportFileUploadProps {
  files: SupportFileValue[];
  onChange: (files: SupportFileValue[]) => void;
}

const MAX_FILES = 2;
const MAX_TOTAL_BYTES = 3 * 1024 * 1024; // 3MB combinado: deja margen bajo el límite de payload de Vercel (4.5MB) tras el ~33% de overhead de base64.

function isAllowedType(type: string): boolean {
  return type === "application/pdf" || type.startsWith("image/");
}

function formatBytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function SupportFileUpload({ files, onChange }: SupportFileUploadProps) {
  const totalBytes = files.reduce((sum, f) => sum + (f.dataUrl.length * 3) / 4, 0);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (files.length >= MAX_FILES) {
      toast.error(`Máximo ${MAX_FILES} documentos de soporte`);
      return;
    }
    if (!isAllowedType(file.type)) {
      toast.error("Solo se permiten archivos PDF o imágenes");
      return;
    }
    if (totalBytes + file.size > MAX_TOTAL_BYTES) {
      toast.error(`El total de documentos no debe superar ${formatBytes(MAX_TOTAL_BYTES)}`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      onChange([...files, { name: file.name, mimeType: file.type, dataUrl: reader.result as string }]);
    };
    reader.onerror = () => toast.error("No se pudo leer el archivo");
    reader.readAsDataURL(file);
  }

  function handleRemove(index: number) {
    onChange(files.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      <ul className="space-y-1.5">
        {files.map((file, index) => {
          const Icon = file.mimeType === "application/pdf" ? FileText : ImageIcon;
          return (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-2.5 py-1.5 text-sm"
            >
              <span className="flex min-w-0 items-center gap-2">
                <Icon className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{file.name}</span>
              </span>
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="shrink-0 text-muted-foreground hover:text-destructive"
                aria-label={`Quitar ${file.name}`}
              >
                <X className="size-4" />
              </button>
            </li>
          );
        })}
      </ul>

      {files.length < MAX_FILES && (
        <div>
          <Button variant="outline" size="sm" render={<label />} nativeButton={false}>
            <Paperclip className="size-4" />
            Adjuntar documento de soporte
            <input type="file" accept="application/pdf,image/*" className="sr-only" onChange={handleFileChange} />
          </Button>
          <p className="mt-1 text-xs text-muted-foreground">
            Opcional. Máximo {MAX_FILES} archivos (PDF o imagen), {formatBytes(MAX_TOTAL_BYTES)} en total.
          </p>
        </div>
      )}
    </div>
  );
}
