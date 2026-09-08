import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth/AuthProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gestión de Ausentismos",
  description: "Plataforma digital de gestión de ausentismos",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* h-dvh (no h-full) para que en navegadores móviles, donde la barra de direcciones
          cambia de tamaño, el layout no exceda el viewport real. overflow-hidden a propósito:
          el body NUNCA debe scrollear por sí mismo — cada página/layout hijo (AppShell, landing,
          público) debe manejar su propio scroll interno con min-h-0 + overflow-y-auto. Si el
          body también scrollea, queda un doble scroll (uno en <main> y otro en el body) que
          en ciertos layouts (ver LeaveRequestForm) se ve como un scroll extra con espacio en
          blanco — cada contenedor de scroll debe ser el único responsable de su propio overflow. */}
      <body className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
        <AuthProvider>{children}</AuthProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
