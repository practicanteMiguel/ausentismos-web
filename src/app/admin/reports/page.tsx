import { adminDb } from "@/lib/firebase/admin";
import { requireRoleOrRedirect } from "@/lib/auth/session";
import { ReportFilters } from "@/components/reports/ReportFilters";
import type { FieldDoc } from "@/types/domain";

export default async function ReportsPage() {
  const admin = await requireRoleOrRedirect("admin");
  const snap = await adminDb.collection("fields").where("contractId", "==", admin.contractId).get();
  const fields = snap.docs.map((d) => ({ id: d.id, name: (d.data() as FieldDoc).name }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reportes</h1>
        <p className="text-sm text-muted-foreground">
          Filtra y exporta las solicitudes de ausentismo de tu contrato.
        </p>
      </div>
      <ReportFilters fields={fields} />
    </div>
  );
}
