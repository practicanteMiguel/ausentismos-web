"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { InviteLinkCard } from "@/components/forms/InviteLinkCard";
import { RefreshCw } from "lucide-react";

export function RegenerateAdminInvite({ contractId }: { contractId: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const response = await fetch(`/api/contracts/${contractId}/invite`, { method: "POST" });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error ?? "Error al generar el enlace");
      setUrl(json.data.url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al generar el enlace");
    } finally {
      setLoading(false);
    }
  }

  if (url) return <InviteLinkCard url={url} label="Nuevo enlace de invitación para el administrador" />;

  return (
    <Button variant="outline" onClick={handleClick} disabled={loading}>
      <RefreshCw className="size-4" />
      {loading ? "Generando..." : "Generar enlace de administrador"}
    </Button>
  );
}
