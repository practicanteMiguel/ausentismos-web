import Link from "next/link";
import { adminDb } from "@/lib/firebase/admin";
import { requireRoleOrRedirect } from "@/lib/auth/session";
import { formatTimestamp } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { LeaveRequestStatusBadge } from "@/components/leave-requests/LeaveRequestStatusBadge";
import { LEAVE_TYPE_LABEL, type LeaveRequest } from "@/types/domain";

export default async function SupervisorLeaveRequestsPage() {
  const supervisor = await requireRoleOrRedirect("supervisor");
  const snap = await adminDb
    .collection("leaveRequests")
    .where("supervisorId", "==", supervisor.uid)
    .orderBy("createdAt", "desc")
    .get();
  const requests = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<LeaveRequest, "id">) }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Solicitudes de ausentismo</h1>
        <p className="text-sm text-muted-foreground">
          Revisa, aprueba o rechaza las solicitudes de tus empleados.
        </p>
      </div>

      {requests.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay solicitudes registradas.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empleado</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Fechas</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => (
              <TableRow key={request.id}>
                <TableCell className="font-medium">{request.employeeName}</TableCell>
                <TableCell>{LEAVE_TYPE_LABEL[request.type]}</TableCell>
                <TableCell className="text-muted-foreground">
                  {formatTimestamp(request.startDate)} — {formatTimestamp(request.endDate)}
                </TableCell>
                <TableCell>
                  <LeaveRequestStatusBadge status={request.status} />
                </TableCell>
                <TableCell className="text-right">
                  {request.status === "PENDIENTE_SUPERVISOR" ? (
                    <Button
                      size="sm"
                      render={<Link href={`/supervisor/leave-requests/${request.id}`} />}
                      nativeButton={false}
                    >
                      Revisar
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      render={<Link href={`/supervisor/leave-requests/${request.id}`} />}
                      nativeButton={false}
                    >
                      Ver detalle
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
