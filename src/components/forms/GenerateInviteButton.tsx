"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { InviteLinkCard } from "@/components/forms/InviteLinkCard";
import { Link as LinkIcon } from "lucide-react";

interface GenerateInviteButtonProps {
  role: "supervisor" | "employee";
  fieldId?: string;
  label: string;
}

export function GenerateInviteButton({ role, fieldId, label }: GenerateInviteButtonProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const response = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, fieldId }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error ?? "Error al generar el enlace");
      setUrl(json.data.url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al generar el enlace");
    } finally {
      setLoading(false);
    }
  }

  if (url) return <InviteLinkCard url={url} label={label} />;

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={loading}>
      <LinkIcon className="size-4" />
      {loading ? "Generando..." : label}
    </Button>
  );
}
