"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";

interface LoadingOverlayProps {
  open: boolean;
  title: string;
  description?: string;
}

/**
 * Overlay de carga a pantalla completa, sin ninguna vía de cierre (ni click afuera ni Escape):
 * se usa para procesos que no deben poder interrumpirse a medias (enviar/firmar un ausentismo).
 * No es un Dialog de Base UI a propósito — un Dialog normal se puede cerrar con Escape/backdrop,
 * y aquí eso dejaría el envío a medias sin que el usuario lo note.
 *
 * Se renderiza en un portal directo a document.body (como hace Dialog) en vez de quedar en el
 * árbol normal del componente: `position: fixed` debería ignorar cualquier ancestro, pero si
 * algún ancestro (ej. las animaciones de un Dialog abierto al mismo tiempo, como al rechazar)
 * crea sin querer un nuevo "containing block" (transform/filter/contain), el overlay queda
 * recortado a ese ancestro en vez de cubrir todo el viewport — con el portal eso ya no puede pasar.
 */
const emptySubscribe = () => () => {};

export function LoadingOverlay({ open, title, description }: LoadingOverlayProps) {
  // Patrón recomendado por React para "¿ya estamos en el cliente?" sin disparar el aviso de
  // set-state-en-efecto: los snapshots corren en render, no en un efecto posterior.
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  if (!open || !mounted) return null;

  return createPortal(
    <div
      role="alertdialog"
      aria-modal="true"
      aria-busy="true"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
    >
      <div className="mx-4 flex max-w-xs flex-col items-center gap-3 rounded-2xl bg-card px-8 py-7 text-center shadow-2xl">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="font-medium text-foreground">{title}</p>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
    </div>,
    document.body
  );
}
