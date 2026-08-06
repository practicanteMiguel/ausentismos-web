/**
 * Cálculo puro (sin dependencias de SDK), usado tanto en el formulario (vista previa en vivo)
 * como en el servidor (fuente de verdad al guardar) — así ambos lados siempre concuerdan.
 *
 * Los valores de fecha-sin-hora (`<input type="date">`) se interpretan siempre como
 * "YYYY-MM-DD" -> medianoche UTC (comportamiento nativo de `new Date(string)`). Por eso aquí
 * se leen y reconstruyen con los getters *UTC* (`getUTCFullYear`, etc.), nunca con los locales
 * (`getFullYear`) — mezclar ambos corre la fecha un día en zonas horarias negativas (ej. Colombia).
 */

/** Días inclusivos entre dos fechas (mismo día = 1). Ignora la hora. */
export function calcLeaveDays(startDate: Date, endDate: Date): number {
  const start = Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate());
  const end = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate());
  const diff = Math.round((end - start) / 86_400_000);
  return Math.max(diff + 1, 1);
}

/**
 * Horas totales = (rango horario diario) x (número de días). Ej: 7:00am-1:00pm son 6 horas/día;
 * en un rango de 3 días eso da 18 horas. Null si falta alguna hora o el rango diario no es positivo.
 */
export function calcLeaveHours(
  numDays: number,
  startTime: string | null,
  endTime: string | null
): number | null {
  if (!startTime || !endTime) return null;

  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  if ([startH, startM, endH, endM].some((n) => Number.isNaN(n))) return null;

  const hoursPerDay = (endH * 60 + endM - (startH * 60 + startM)) / 60;
  if (hoursPerDay <= 0) return null;

  return Math.round(hoursPerDay * numDays * 100) / 100;
}
