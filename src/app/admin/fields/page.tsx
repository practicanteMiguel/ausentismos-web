import { adminDb } from "@/lib/firebase/admin";
import { requireRoleOrRedirect } from "@/lib/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FieldForm } from "@/components/forms/FieldForm";
import { GenerateInviteButton } from "@/components/forms/GenerateInviteButton";
import { Users } from "lucide-react";
import type { FieldDoc, UserDoc } from "@/types/domain";

export default async function FieldsPage() {
  const admin = await requireRoleOrRedirect("admin");
  const [fieldsSnap, employeesSnap] = await Promise.all([
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {fields.map((field) => (
            <Card key={field.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{field.name}</CardTitle>
                <Badge variant={field.status === "ACTIVO" ? "default" : "secondary"}>
                  {field.status === "ACTIVO" ? "Activo" : "Inactivo"}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Users className="size-4" />
                  {employeeCountByField.get(field.id) ?? 0} persona
                  {(employeeCountByField.get(field.id) ?? 0) === 1 ? "" : "s"} registrada
                  {(employeeCountByField.get(field.id) ?? 0) === 1 ? "" : "s"}
                </div>
                <GenerateInviteButton
                  role="supervisor"
                  fieldId={field.id}
                  label="Invitar supervisor"
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
