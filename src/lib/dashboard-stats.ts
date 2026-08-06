import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";

export interface MonthlyCount {
  month: string;
  count: number;
}

const MONTH_LABEL = new Intl.DateTimeFormat("es-CO", { month: "short", timeZone: "UTC" });

/** Cuenta ausentismos creados en los últimos `months` meses (incluido el actual), agrupados por mes. */
export async function getMonthlyLeaveRequestCounts(
  months: number,
  contractId?: string | null
): Promise<MonthlyCount[]> {
  const now = new Date();
  const rangeStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));

  let query = adminDb
    .collection("leaveRequests")
    .where("createdAt", ">=", Timestamp.fromDate(rangeStart));
  if (contractId) {
    query = query.where("contractId", "==", contractId);
  }
  const snap = await query.get();

  const buckets = new Map<string, number>();
  for (let i = 0; i < months; i++) {
    const d = new Date(Date.UTC(rangeStart.getUTCFullYear(), rangeStart.getUTCMonth() + i, 1));
    buckets.set(`${d.getUTCFullYear()}-${d.getUTCMonth()}`, 0);
  }

  for (const doc of snap.docs) {
    const createdAt = doc.data().createdAt as Timestamp | undefined;
    if (!createdAt) continue;
    const d = createdAt.toDate();
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
  }

  return Array.from(buckets.entries()).map(([key, count]) => {
    const [year, month] = key.split("-").map(Number);
    const label = MONTH_LABEL.format(new Date(Date.UTC(year, month, 1)));
    return { month: label.charAt(0).toUpperCase() + label.slice(1), count };
  });
}
