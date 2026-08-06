import { adminDb } from "@/lib/firebase/admin";
import { requireRoleOrRedirect } from "@/lib/auth/session";
import { getMonthlyLeaveRequestCounts } from "@/lib/dashboard-stats";
import { StatCard } from "@/components/dashboards/StatCard";
import { QuickActions } from "@/components/dashboards/QuickActions";
import { RecentActivityWidget } from "@/components/dashboards/RecentActivityWidget";
import { MonthlyAbsencesChart } from "@/components/dashboards/MonthlyAbsencesChart";
import { ClipboardList, FileText, Clock, Building2, BarChart3 } from "lucide-react";

export default async function AdminDashboard() {
  const admin = await requireRoleOrRedirect("admin");
  const base = adminDb.collection("leaveRequests").where("contractId", "==", admin.contractId);

  const [total, finalized, pendingSupervisor, approvedNoPdf, monthlyCounts] = await Promise.all([
    base.count().get(),
    base.where("status", "==", "FINALIZADO").count().get(),
    base.where("status", "==", "PENDIENTE_SUPERVISOR").count().get(),
    base.where("status", "==", "APROBADO").count().get(),
    getMonthlyLeaveRequestCounts(6, admin.contractId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Panel del contrato</h1>
        <p className="text-sm text-muted-foreground">Resumen de solicitudes y documentos generados.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Solicitudes del contrato" value={total.data().count} icon={ClipboardList} color="primary" />
        <StatCard label="PDFs generados" value={finalized.data().count} icon={FileText} color="success" />
        <StatCard label="Pendientes de supervisor" value={pendingSupervisor.data().count} icon={Clock} color="warning" />
        <StatCard label="Aprobadas (PDF en proceso)" value={approvedNoPdf.data().count} icon={FileText} color="info" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <QuickActions
            actions={[
              { label: "Crear campo", href: "/admin/fields", icon: Building2 },
              { label: "Ver reportes", href: "/admin/reports", icon: BarChart3 },
              { label: "Descargar PDFs", href: "/admin/leave-requests", icon: FileText },
            ]}
          />
          <MonthlyAbsencesChart data={monthlyCounts} />
        </div>
        <RecentActivityWidget />
      </div>
    </div>
  );
}
