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

export default async function EmployeeLeaveRequestsPage() {
  const employee = await requireRoleOrRedirect("employee");
  const snap = await adminDb
    .collection("leaveRequests")
    .where("employeeId", "==", employee.uid)
    .orderBy("createdAt", "desc")
    .get();
  const requests = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<LeaveRequest, "id">) }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Historial de ausentismos</h1>
        <p className="text-sm text-muted-foreground">Consulta el estado de tus solicitudes.</p>
      </div>

      {requests.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aún no has creado ninguna solicitud.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Fechas</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">PDF</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => (
              <TableRow key={request.id}>
                <TableCell>{LEAVE_TYPE_LABEL[request.type]}</TableCell>
                <TableCell className="text-muted-foreground">
                  {formatTimestamp(request.startDate)} — {formatTimestamp(request.endDate)}
                </TableCell>
                <TableCell>
                  <LeaveRequestStatusBadge status={request.status} />
                  {request.status === "RECHAZADO" && request.rejectionReason && (
                    <p className="mt-1 text-xs text-muted-foreground">{request.rejectionReason}</p>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {request.pdf ? (
                    <Button
                      variant="outline"
                      size="sm"
                      render={<Link href={`/api/leave-requests/${request.id}/download`} target="_blank" />}
                      nativeButton={false}
                    >
                      Ver PDF
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
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
