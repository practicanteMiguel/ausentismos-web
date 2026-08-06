import { adminDb } from "@/lib/firebase/admin";
import { requireRoleOrRedirect } from "@/lib/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GenerateInviteButton } from "@/components/forms/GenerateInviteButton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { UserDoc } from "@/types/domain";

export default async function SupervisorEmployeesPage() {
  const supervisor = await requireRoleOrRedirect("supervisor");
  const snap = await adminDb
    .collection("employees")
    .where("supervisorId", "==", supervisor.uid)
    .orderBy("createdAt", "desc")
    .get();
  const employees = snap.docs.map((d) => d.data() as Omit<UserDoc, "id">);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Empleados</h1>
          <p className="text-sm text-muted-foreground">
            Comparte el enlace permanente para que tus empleados se registren.
          </p>
        </div>
        <div className="w-full sm:w-auto sm:max-w-xs">
          <GenerateInviteButton role="employee" label="Enlace de invitación de empleados" />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Empleados registrados ({employees.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay empleados registrados.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Cédula</TableHead>
                  <TableHead>Correo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.email}>
                    <TableCell className="font-medium">{employee.name}</TableCell>
                    <TableCell>{employee.cedula}</TableCell>
                    <TableCell className="text-muted-foreground">{employee.email}</TableCell>
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
