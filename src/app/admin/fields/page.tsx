import { adminDb } from "@/lib/firebase/admin";
import { requireRoleOrRedirect } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import { FieldForm } from "@/components/forms/FieldForm";
import { GenerateInviteButton } from "@/components/forms/GenerateInviteButton";
import { UserListItem } from "@/components/users/UserListItem";
import { UserCog, Users } from "lucide-react";
import type { FieldDoc, UserDoc } from "@/types/domain";

export default async function FieldsPage() {
  const admin = await requireRoleOrRedirect("admin");
  const [fieldsSnap, supervisorsSnap, employeesSnap] = await Promise.all([
    adminDb
      .collection("fields")
      .where("contractId", "==", admin.contractId)
      .orderBy("createdAt", "desc")
      .get(),
    adminDb.collection("supervisors").where("contractId", "==", admin.contractId).get(),
    adminDb.collection("employees").where("contractId", "==", admin.contractId).get(),
  ]);
  const fields = fieldsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FieldDoc, "id">) }));
  const supervisors = supervisorsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<UserDoc, "id">) }));
  const employees = employeesSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<UserDoc, "id">) }));

  const supervisorsByField = new Map<string, UserDoc[]>();
  for (const supervisor of supervisors) {
    if (!supervisor.fieldId) continue;
    const list = supervisorsByField.get(supervisor.fieldId) ?? [];
    list.push(supervisor);
    supervisorsByField.set(supervisor.fieldId, list);
  }

  const employeesBySupervisor = new Map<string, UserDoc[]>();
  for (const employee of employees) {
    if (!employee.supervisorId) continue;
    const list = employeesBySupervisor.get(employee.supervisorId) ?? [];
    list.push(employee);
    employeesBySupervisor.set(employee.supervisorId, list);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Campos</h1>
          <p className="text-sm text-muted-foreground">
            Crea campos y genera enlaces de invitación para sus supervisores.
          </p>
        </div>
        <FieldForm />
      </div>

      {fields.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aún no has creado ningún campo.</p>
      ) : (
        <div className="space-y-5">
          {fields.map((field) => {
            const fieldSupervisors = supervisorsByField.get(field.id) ?? [];
            return (
              <div key={field.id} className="rounded-xl border p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{field.name}</p>
                    <Badge variant={field.status === "ACTIVO" ? "success" : "outline"}>
                      {field.status === "ACTIVO" ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                  <GenerateInviteButton
                    role="supervisor"
                    fieldId={field.id}
                    label="Invitar supervisor"
                  />
                </div>

                {fieldSupervisors.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Este campo todavía no tiene supervisor asignado.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {fieldSupervisors.map((supervisor) => {
                      const supervisorEmployees = employeesBySupervisor.get(supervisor.id) ?? [];
                      return (
                        <div key={supervisor.id} className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-(--chart-3)/10 text-chart-3">
                              <UserCog className="size-3.5" />
                            </div>
                            Supervisor
                          </div>
                          <ul className="space-y-2 pl-8">
                            <UserListItem
                              uid={supervisor.id}
                              name={supervisor.name}
                              email={supervisor.email}
                              cedula={supervisor.cedula}
                              status={supervisor.status}
                            />
                          </ul>
                          <div className="flex items-center gap-2 pl-8 text-sm font-medium text-foreground">
                            <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-success/10 text-success">
                              <Users className="size-3.5" />
                            </div>
                            Empleados ({supervisorEmployees.length})
                          </div>
                          {supervisorEmployees.length === 0 ? (
                            <p className="pl-8 text-sm text-muted-foreground">
                              Este supervisor aún no tiene empleados registrados.
                            </p>
                          ) : (
                            <ul className="space-y-2 pl-8">
                              {supervisorEmployees.map((employee) => (
                                <UserListItem
                                  key={employee.id}
                                  uid={employee.id}
                                  name={employee.name}
                                  email={employee.email}
                                  cedula={employee.cedula}
                                  status={employee.status}
                                />
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
