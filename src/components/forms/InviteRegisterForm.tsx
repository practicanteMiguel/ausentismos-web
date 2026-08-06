"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { signInWithCustomToken } from "firebase/auth";
import { toast } from "sonner";
import { Building2, UserCircle2 } from "lucide-react";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { ROLE_HOME, ROLE_LABEL } from "@/lib/auth/roles";
import type { InviteRole, Role } from "@/types/domain";

interface InviteRegisterFormProps {
  role: InviteRole;
  token: string;
  contractName: string;
  fieldName: string | null;
  supervisorName: string | null;
}

export function InviteRegisterForm({
  role,
  token,
  contractName,
  fieldName,
  supervisorName,
}: InviteRegisterFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cedula, setCedula] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`/api/invites/${token}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          ...(role === "employee" || role === "supervisor" ? { cedula } : {}),
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) {
        throw new Error(json.error ?? "No se pudo completar el registro");
      }

      const credential = await signInWithCustomToken(getFirebaseAuth(), json.data.customToken);
      const idToken = await credential.user.getIdToken();
      await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      const registeredRole = json.data.role as Role;
      toast.success("Cuenta creada correctamente");
      router.push(ROLE_HOME[registeredRole]);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al registrarse");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-card shadow-2xl ring-1 ring-black/5">
      <div className="space-y-1 px-8 pt-8 pb-4 text-center">
        <div className="mx-auto mb-3 flex h-14 w-32 items-center justify-center">
          <Image
            src="/assets/img/logo-sas.png"
            alt="SAS Servicios Asociados"
            width={160}
            height={66}
            className="h-full w-auto object-contain"
            priority
          />
        </div>
        <h1 className="text-xl font-semibold text-foreground">Registro de {ROLE_LABEL[role]}</h1>
        <p className="text-sm text-muted-foreground">Completa tus datos para crear tu cuenta.</p>
      </div>

      <div className="space-y-4 px-8 pb-8">
        <div className="flex items-start gap-3 rounded-xl bg-info/10 p-3 text-sm">
          <Building2 className="mt-0.5 size-4 shrink-0 text-info" />
          <div className="space-y-0.5 text-foreground">
            <p className="font-medium">Te vas a unir a:</p>
            <p className="text-muted-foreground">Contrato: {contractName}</p>
            {fieldName && <p className="text-muted-foreground">Campo: {fieldName}</p>}
            {supervisorName && (
              <p className="flex items-center gap-1 text-muted-foreground">
                <UserCircle2 className="size-3.5" /> Supervisor: {supervisorName}
              </p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre completo</Label>
            <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          {(role === "employee" || role === "supervisor") && (
            <div className="space-y-2">
              <Label htmlFor="cedula">Cédula</Label>
              <Input
                id="cedula"
                required
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <PasswordInput
              id="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </Button>
        </form>
      </div>
    </div>
  );
}
