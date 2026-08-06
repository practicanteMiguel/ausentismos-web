"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function InviteLinkCard({ url, label }: { url: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Enlace copiado");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="w-full min-w-0 space-y-1.5">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex min-w-0 gap-2">
        <Input readOnly value={url} className="min-w-0 flex-1 font-mono text-xs" />
        <Button type="button" variant="outline" size="icon" onClick={handleCopy} className="shrink-0">
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </Button>
      </div>
    </div>
  );
}
