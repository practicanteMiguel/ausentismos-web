import { adminDb } from "@/lib/firebase/admin";
import { requireRoleOrRedirect } from "@/lib/auth/session";
import { startOfTodayTimestamp } from "@/lib/format";
import { StatCard } from "@/components/dashboards/StatCard";
import { QuickActions } from "@/components/dashboards/QuickActions";
import { RecentActivityWidget } from "@/components/dashboards/RecentActivityWidget";
import { Clock, CheckCircle2, XCircle, CalendarDays, ClipboardList } from "lucide-react";

export default async function CoordinatorDashboard() {
  const coordinator = await requireRoleOrRedirect("coordinator");
  const base = adminDb.collection("leaveRequests").where("supervisorId", "==", coordinator.uid);
  const startOfToday = startOfTodayTimestamp();

  const [pending, approved, rejected, today] = await Promise.all([
    base.where("status", "==", "PENDIENTE_SUPERVISOR").count().get(),
    base.where("status", "in", ["APROBADO", "PDF_GENERADO", "FINALIZADO"]).count().get(),
    base.where("status", "==", "RECHAZADO").count().get(),
    base.where("createdAt", ">=", startOfToday).count().get(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Panel de coordinación</h1>
        <p className="text-sm text-muted-foreground">
          Ausentismos de supervisores y del administrador de tu contrato.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Pendientes" value={pending.data().count} icon={Clock} color="warning" />
        <StatCard label="Aprobadas" value={approved.data().count} icon={CheckCircle2} color="success" />
        <StatCard label="Rechazadas" value={rejected.data().count} icon={XCircle} color="destructive" />
        <StatCard label="Hoy" value={today.data().count} icon={CalendarDays} color="info" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <QuickActions
            actions={[
              {
                label: "Revisar siguiente solicitud",
                href: "/coordinator/leave-requests",
                icon: ClipboardList,
              },
            ]}
          />
        </div>
        <RecentActivityWidget />
      </div>
    </div>
  );
}
