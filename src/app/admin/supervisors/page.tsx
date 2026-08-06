import { adminDb } from "@/lib/firebase/admin";
import { requireRoleOrRedirect } from "@/lib/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { FieldDoc, UserDoc } from "@/types/domain";

export default async function AdminSupervisorsPage() {
  const admin = await requireRoleOrRedirect("admin");
  const [supervisorsSnap, fieldsSnap] = await Promise.all([
    adminDb.collection("supervisors").where("contractId", "==", admin.contractId).get(),
    adminDb.collection("fields").where("contractId", "==", admin.contractId).get(),
  ]);

  const fieldNameById = new Map(
    fieldsSnap.docs.map((d) => [d.id, (d.data() as FieldDoc).name])
  );
  const supervisors = supervisorsSnap.docs.map((d) => d.data() as Omit<UserDoc, "id">);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Supervisores</h1>
        <p className="text-sm text-muted-foreground">
          Supervisores registrados en los campos de tu contrato.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Total: {supervisors.length}</CardTitle>
        </CardHeader>
        <CardContent>
          {supervisors.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aún no hay supervisores registrados. Invítalos desde la sección Campos.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Cédula</TableHead>
                  <TableHead>Correo</TableHead>
                  <TableHead>Campo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supervisors.map((supervisor) => (
                  <TableRow key={supervisor.email}>
                    <TableCell className="font-medium">{supervisor.name}</TableCell>
                    <TableCell className="text-muted-foreground">{supervisor.cedula ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{supervisor.email}</TableCell>
                    <TableCell>{fieldNameById.get(supervisor.fieldId ?? "") ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
