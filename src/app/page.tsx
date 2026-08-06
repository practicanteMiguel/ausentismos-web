import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { PenTool, FolderCheck, Bell, ShieldCheck, ArrowRight, Sparkles } from "lucide-react";

const FEATURES = [
  {
    icon: PenTool,
    title: "Firma digital",
    description: "Empleado y supervisor firman desde cualquier dispositivo, sin papel.",
    color: "text-primary bg-primary/10",
  },
  {
    icon: FolderCheck,
    title: "PDF automático",
    description: "El documento oficial se genera y archiva solo, con el formato de la empresa.",
    color: "text-info bg-info/10",
  },
  {
    icon: Bell,
    title: "Centro de actividad",
    description: "Cada usuario ve en tiempo real qué pasó y qué tiene pendiente.",
    color: "text-warning bg-warning/10",
  },
  {
    icon: ShieldCheck,
    title: "Trazabilidad total",
    description: "Auditoría completa de cada acción, contrato y usuario.",
    color: "text-success bg-success/10",
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4 md:px-12">
        <Image
          src="/assets/img/logo-sas.png"
          alt="SAS Servicios Asociados"
          width={140}
          height={58}
          className="h-8 w-auto object-contain"
          priority
        />
        <Button render={<Link href="/login" />} nativeButton={false} variant="outline">
          Iniciar sesión
        </Button>
      </header>

      <main className="flex-1">
        {/* Hero / mural */}
        <section className="relative overflow-hidden bg-linear-to-br from-[oklch(0.22_0.06_262)] via-[oklch(0.32_0.11_262)] to-[oklch(0.48_0.17_258)] px-6 py-20 text-center text-white md:px-12 md:py-28">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 left-1/4 size-96 rounded-full bg-white/10 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-32 right-1/4 size-104 rounded-full bg-[oklch(0.7_0.14_195)]/20 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,white_1px,transparent_1px)] bg-size-[28px_28px] opacity-[0.05]"
          />

          <div className="relative z-10 mx-auto max-w-3xl space-y-6">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-sm">
              <Sparkles className="size-3.5" />
              Gestión digital de ausentismos
            </span>
            <h1 className="text-4xl font-bold tracking-tight text-balance md:text-5xl">
              Del papel a la firma digital, en un solo lugar
            </h1>
            <p className="mx-auto max-w-xl text-white/80">
              Diligencia, aprueba, firma y archiva ausentismos de tu equipo sin papel, sin
              correos perdidos y con trazabilidad completa de principio a fin.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button render={<Link href="/login" />} nativeButton={false} size="lg">
                Ingresar a la plataforma
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-5xl px-6 py-16 md:px-12">
          <div className="mx-auto mb-10 max-w-xl text-center">
            <h2 className="text-2xl font-semibold">Todo el flujo, en una sola plataforma</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Desde que el empleado diligencia el formulario hasta que el administrador
              descarga el PDF firmado.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div
                  className={`mb-3 flex size-10 items-center justify-center rounded-xl ${feature.color}`}
                >
                  <feature.icon className="size-5" />
                </div>
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t px-6 py-6 text-center text-xs text-muted-foreground md:px-12">
        SAS Servicios Asociados — Plataforma de Gestión de Ausentismos
      </footer>
    </div>
  );
}
