import Link from "next/link";
import { notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { formatTimestamp } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ContractStatusBadge } from "@/components/contracts/ContractStatusBadge";
import { RegenerateAdminInvite } from "@/components/contracts/RegenerateAdminInvite";
import { UserListItem } from "@/components/users/UserListItem";
import { ArrowLeft, ShieldCheck, Building2, UserCog, Users } from "lucide-react";
import type { Contract, FieldDoc, UserDoc } from "@/types/domain";

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [contractSnap, fieldsSnap, administratorsSnap, supervisorsSnap, employeesSnap] =
    await Promise.all([
      adminDb.collection("contracts").doc(id).get(),
      adminDb.collection("fields").where("contractId", "==", id).get(),
      adminDb.collection("administrators").where("contractId", "==", id).get(),
      adminDb.collection("supervisors").where("contractId", "==", id).get(),
      adminDb.collection("employees").where("contractId", "==", id).get(),
    ]);

  if (!contractSnap.exists) notFound();
  const contract = contractSnap.data() as Omit<Contract, "id">;
  const fields = fieldsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as FieldDoc);
  const administrators = administratorsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as UserDoc);
  const supervisors = supervisorsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as UserDoc);
  const employees = employeesSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as UserDoc);

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
      <Button
        variant="ghost"
        size="sm"
        render={<Link href="/super-admin/contracts" />}
        nativeButton={false}
      >
        <ArrowLeft className="size-4" />
        Volver a contratos
      </Button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            {contract.name} <span className="text-muted-foreground">#{contract.number}</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            {formatTimestamp(contract.startDate)} — {formatTimestamp(contract.endDate)}
          </p>
        </div>
        <ContractStatusBadge status={contract.status} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invitación de administrador</CardTitle>
          </CardHeader>
          <CardContent>
            <RegenerateAdminInvite contractId={id} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Almacenamiento en Drive</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {contract.driveFolderId
              ? "Carpeta creada correctamente en Google Drive."
              : "La carpeta aún no se ha creado. Se creará automáticamente al generar el primer PDF."}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="size-4" />
            </div>
            Administrador ({administrators.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {administrators.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aún no se ha registrado un administrador para este contrato.
            </p>
          ) : (
            <ul className="space-y-2">
              {administrators.map((admin) => (
                <UserListItem
                  key={admin.id}
                  uid={admin.id}
                  name={admin.name}
                  email={admin.email}
                  status={admin.status}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="flex size-8 items-center justify-center rounded-lg bg-info/10 text-info">
              <Building2 className="size-4" />
            </div>
            Campos ({fields.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {fields.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              El administrador aún no ha creado campos en este contrato.
            </p>
          ) : (
            <div className="space-y-5">
              {fields.map((field) => {
                const fieldSupervisors = supervisorsByField.get(field.id) ?? [];
                return (
                  <div key={field.id} className="rounded-xl border p-4">
                    <p className="mb-3 font-medium">{field.name}</p>
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
                                <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-[var(--chart-3)]/10 text-[var(--chart-3)]">
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
        </CardContent>
      </Card>
    </div>
  );
}
