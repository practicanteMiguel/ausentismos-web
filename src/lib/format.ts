import { Timestamp as AdminTimestamp } from "firebase-admin/firestore";
import type { Timestamp } from "@/types/domain";

/**
 * Para fechas de solo-día (`startDate`/`endDate` de contratos y ausentismos), guardadas como
 * medianoche UTC a partir de un `<input type="date">`. Se formatea fijado a UTC para que el día
 * mostrado no dependa de la zona horaria del servidor (en local puede no ser UTC).
 */
export function formatTimestamp(ts: Timestamp | undefined | null): string {
  if (!ts) return "—";
  return ts.toDate().toLocaleDateString("es-CO", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    timeZone: "UTC",
  });
}

/** Para momentos reales (ej. `createdAt` de auditoría), en la hora local del servidor. */
export function formatInstant(ts: Timestamp | undefined | null): string {
  if (!ts) return "—";
  return ts.toDate().toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "2-digit" });
}

export function timestampDaysFromNow(days: number): AdminTimestamp {
  return AdminTimestamp.fromDate(new Date(Date.now() + days * 24 * 60 * 60 * 1000));
}

export function startOfTodayTimestamp(): AdminTimestamp {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return AdminTimestamp.fromDate(now);
}
