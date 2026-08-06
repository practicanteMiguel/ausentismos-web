import { adminDb } from "@/lib/firebase/admin";
import { timestampDaysFromNow } from "@/lib/format";
import { getMonthlyLeaveRequestCounts } from "@/lib/dashboard-stats";
import { StatCard } from "@/components/dashboards/StatCard";
import { QuickActions } from "@/components/dashboards/QuickActions";
import { RecentActivityWidget } from "@/components/dashboards/RecentActivityWidget";
import { MonthlyAbsencesChart } from "@/components/dashboards/MonthlyAbsencesChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileStack, Users, ClipboardList, ShieldCheck, Plus, FolderKanban } from "lucide-react";
import type { Contract } from "@/types/domain";

export default async function SuperAdminDashboard() {
  const [
    activeContracts,
    expiredContracts,
    employees,
    supervisors,
    administrators,
    leaveRequests,
    monthlyCounts,
  ] = await Promise.all([
    adminDb.collection("contracts").where("status", "==", "ACTIVO").count().get(),
    adminDb.collection("contracts").where("status", "==", "VENCIDO").count().get(),
    adminDb.collection("employees").count().get(),
    adminDb.collection("supervisors").count().get(),
    adminDb.collection("administrators").count().get(),
    adminDb.collection("leaveRequests").count().get(),
    getMonthlyLeaveRequestCounts(6),
  ]);

  const in30Days = timestampDaysFromNow(30);
  const expiringSnap = await adminDb
    .collection("contracts")
    .where("status", "==", "ACTIVO")
    .where("endDate", "<=", in30Days)
    .limit(10)
    .get();
  const expiring = expiringSnap.docs.map((d) => d.data() as Omit<Contract, "id">);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Panel general</h1>
        <p className="text-sm text-muted-foreground">Visión global de todos los contratos.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Contratos activos" value={activeContracts.data().count} icon={FileStack} color="success" />
        <StatCard label="Contratos vencidos" value={expiredContracts.data().count} icon={FileStack} color="destructive" />
        <StatCard label="Empleados" value={employees.data().count} icon={Users} color="info" />
        <StatCard label="Supervisores" value={supervisors.data().count} icon={Users} color="violet" />
        <StatCard label="Administradores" value={administrators.data().count} icon={ShieldCheck} color="primary" />
        <StatCard label="Solicitudes" value={leaveRequests.data().count} icon={ClipboardList} color="warning" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <QuickActions
            actions={[
              { label: "Crear contrato", href: "/super-admin/contracts", icon: Plus },
              { label: "Ver contratos", href: "/super-admin/contracts", icon: FolderKanban },
              { label: "Auditoría general", href: "/super-admin/audit", icon: ShieldCheck },
            ]}
          />

          <MonthlyAbsencesChart data={monthlyCounts} />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contratos próximos a vencer (30 días)</CardTitle>
            </CardHeader>
            <CardContent>
              {expiring.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay contratos próximos a vencer.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {expiring.map((c) => (
                    <li key={c.number}>
                      {c.name} <span className="text-muted-foreground">#{c.number}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <RecentActivityWidget />
      </div>
    </div>
  );
}
