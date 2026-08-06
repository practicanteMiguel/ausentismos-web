"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { signInWithEmailAndPassword } from "firebase/auth";
import { toast } from "sonner";
import { Mail } from "lucide-react";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { ROLE_HOME } from "@/lib/auth/roles";
import type { Role } from "@/types/domain";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const credential = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
      const idToken = await credential.user.getIdToken();

      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (!response.ok) throw new Error("No se pudo iniciar sesión");

      const tokenResult = await credential.user.getIdTokenResult();
      const role = tokenResult.claims.role as Role | undefined;
      const redirect = searchParams.get("redirect");
      toast.success("Sesión iniciada correctamente");
      router.push(redirect || (role ? ROLE_HOME[role] : "/"));
      router.refresh();
    } catch {
      toast.error("Credenciales inválidas. Verifica tu correo y contraseña.");
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
        <h1 className="text-xl font-semibold text-foreground">Iniciar sesión</h1>
        <p className="text-sm text-muted-foreground">
          Ingresa con tu correo y contraseña para continuar.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 px-8 pb-8">
        <div className="space-y-2">
          <Label htmlFor="email">Correo electrónico</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              placeholder="nombre@empresa.com"
              className="pl-8"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? "Ingresando..." : "Ingresar"}
        </Button>
      </form>
    </div>
  );
}
