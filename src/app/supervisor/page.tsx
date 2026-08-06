import { adminDb } from "@/lib/firebase/admin";
import { requireRoleOrRedirect } from "@/lib/auth/session";
import { startOfTodayTimestamp } from "@/lib/format";
import { StatCard } from "@/components/dashboards/StatCard";
import { QuickActions } from "@/components/dashboards/QuickActions";
import { RecentActivityWidget } from "@/components/dashboards/RecentActivityWidget";
import { Clock, CheckCircle2, XCircle, CalendarDays, ClipboardList, Users, Link as LinkIcon } from "lucide-react";

export default async function SupervisorDashboard() {
  const supervisor = await requireRoleOrRedirect("supervisor");
  const base = adminDb.collection("leaveRequests").where("supervisorId", "==", supervisor.uid);
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
        <h1 className="text-2xl font-semibold">Panel de supervisión</h1>
        <p className="text-sm text-muted-foreground">Solicitudes de tu equipo.</p>
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
              { label: "Revisar siguiente solicitud", href: "/supervisor/leave-requests", icon: ClipboardList },
              { label: "Ver empleados", href: "/supervisor/employees", icon: Users },
              { label: "Invitar empleados", href: "/supervisor/employees", icon: LinkIcon },
            ]}
          />
        </div>
        <RecentActivityWidget />
      </div>
    </div>
  );
}
