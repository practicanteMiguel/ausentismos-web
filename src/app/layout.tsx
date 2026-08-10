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
      {/* h-dvh (no h-full) para que en navegadores móviles, donde la barra de
          direcciones cambia de tamaño, el layout no exceda el viewport real. No lleva
          overflow-hidden: el AppShell (dashboard) ya scrollea internamente en su <main> y
          encaja exacto en h-dvh, pero landing/login necesitan que el body scrollee cuando
          su contenido es más alto que el viewport (p.ej. en móvil). */}
      <body className="flex h-dvh flex-col overflow-y-auto bg-background text-foreground">
        <AuthProvider>{children}</AuthProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
