import Link from "next/link";
import { adminDb } from "@/lib/firebase/admin";
import { requireRoleOrRedirect } from "@/lib/auth/session";
import { getMonthlyLeaveRequestCounts } from "@/lib/dashboard-stats";
import { StatCard } from "@/components/dashboards/StatCard";
import { QuickActions } from "@/components/dashboards/QuickActions";
import { RecentActivityWidget } from "@/components/dashboards/RecentActivityWidget";
import { MonthlyAbsencesChart } from "@/components/dashboards/MonthlyAbsencesChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardList, FileText, Clock, Building2, BarChart3, Users, ArrowRight } from "lucide-react";
import type { FieldDoc, UserDoc } from "@/types/domain";

export default async function AdminDashboard() {
  const admin = await requireRoleOrRedirect("admin");
  const base = adminDb.collection("leaveRequests").where("contractId", "==", admin.contractId);

  const [total, finalized, pendingSupervisor, approvedNoPdf, monthlyCounts, fieldsSnap, employeesSnap] =
    await Promise.all([
      base.count().get(),
      base.where("status", "==", "FINALIZADO").count().get(),
      base.where("status", "==", "PENDIENTE_SUPERVISOR").count().get(),
      base.where("status", "==", "APROBADO").count().get(),
      getMonthlyLeaveRequestCounts(6, admin.contractId),
      adminDb
        .collection("fields")
        .where("contractId", "==", admin.contractId)
        .orderBy("createdAt", "desc")
        .get(),
      adminDb.collection("employees").where("contractId", "==", admin.contractId).get(),
    ]);

  const fields = fieldsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FieldDoc, "id">) }));
  const employeeCountByField = new Map<string, number>();
  for (const doc of employeesSnap.docs) {
    const fieldId = (doc.data() as UserDoc).fieldId;
    if (!fieldId) continue;
    employeeCountByField.set(fieldId, (employeeCountByField.get(fieldId) ?? 0) + 1);
  }

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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="flex size-8 items-center justify-center rounded-lg bg-info/10 text-info">
              <Building2 className="size-4" />
            </div>
            Campos ({fields.length})
          </CardTitle>
          <Button variant="ghost" size="sm" render={<Link href="/admin/fields" />} nativeButton={false}>
            Ver todos
            <ArrowRight className="size-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {fields.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no has creado ningún campo.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {fields.map((field) => {
                const count = employeeCountByField.get(field.id) ?? 0;
                return (
                  <li
                    key={field.id}
                    className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm"
                  >
                    <span className="truncate font-medium">{field.name}</span>
                    <span className="flex shrink-0 items-center gap-1 text-muted-foreground">
                      <Users className="size-3.5" />
                      {count}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
