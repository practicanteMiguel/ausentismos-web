import { adminDb } from "@/lib/firebase/admin";
import { requireRoleOrRedirect } from "@/lib/auth/session";
import { StatCard } from "@/components/dashboards/StatCard";
import { QuickActions } from "@/components/dashboards/QuickActions";
import { RecentActivityWidget } from "@/components/dashboards/RecentActivityWidget";
import { Clock, CheckCircle2, XCircle, UserPlus, History, FileText } from "lucide-react";

export default async function EmployeeDashboard() {
  const employee = await requireRoleOrRedirect("employee");
  const base = adminDb.collection("leaveRequests").where("employeeId", "==", employee.uid);

  const [pending, approved, rejected] = await Promise.all([
    base.where("status", "==", "PENDIENTE_SUPERVISOR").count().get(),
    base.where("status", "in", ["APROBADO", "PDF_GENERADO", "FINALIZADO"]).count().get(),
    base.where("status", "==", "RECHAZADO").count().get(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Mi panel</h1>
        <p className="text-sm text-muted-foreground">Estado de tus solicitudes de ausentismo.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Pendientes" value={pending.data().count} icon={Clock} color="warning" />
        <StatCard label="Aprobadas" value={approved.data().count} icon={CheckCircle2} color="success" />
        <StatCard label="Rechazadas" value={rejected.data().count} icon={XCircle} color="destructive" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <QuickActions
            actions={[
              { label: "Nuevo ausentismo", href: "/employee/leave-requests/new", icon: UserPlus },
              { label: "Historial", href: "/employee/leave-requests", icon: History },
              { label: "Descargar PDF", href: "/employee/leave-requests", icon: FileText },
            ]}
          />
        </div>
        <RecentActivityWidget />
      </div>
    </div>
  );
}
