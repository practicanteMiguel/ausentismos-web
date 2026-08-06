"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export function RetryPdfButton({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const response = await fetch(`/api/leave-requests/${requestId}/generate-pdf`, {
        method: "POST",
      });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error ?? "Error al generar el PDF");
      toast.success("PDF generado correctamente");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al generar el PDF");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={loading}>
      <RefreshCw className="size-4" />
      {loading ? "Generando..." : "Reintentar generación de PDF"}
    </Button>
  );
}
