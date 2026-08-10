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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { LeaveRequestStatusBadge } from "@/components/leave-requests/LeaveRequestStatusBadge";
import { RetryPdfButton } from "@/components/leave-requests/RetryPdfButton";
import { LEAVE_TYPE_LABEL, type FieldDoc, type LeaveRequest } from "@/types/domain";

export default async function AdminLeaveRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; fieldId?: string }>;
}) {
  const admin = await requireRoleOrRedirect("admin");
  const { month, fieldId } = await searchParams;

  let query = adminDb
    .collection("leaveRequests")
    .where("contractId", "==", admin.contractId) as FirebaseFirestore.Query;

  if (fieldId) {
    query = query.where("fieldId", "==", fieldId);
  }

  if (month) {
    const [yearStr, monthStr] = month.split("-");
    const year = Number(yearStr);
    const monthIndex = Number(monthStr) - 1;
    const monthStart = new Date(Date.UTC(year, monthIndex, 1));
    const monthEnd = new Date(Date.UTC(year, monthIndex + 1, 1));
    query = query
      .where("startDate", ">=", monthStart)
      .where("startDate", "<", monthEnd)
      .orderBy("startDate", "desc");
  } else {
    query = query.orderBy("createdAt", "desc").limit(100);
  }

  const [snap, fieldsSnap] = await Promise.all([
    query.get(),
    adminDb.collection("fields").where("contractId", "==", admin.contractId).get(),
  ]);
  const requests = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<LeaveRequest, "id">) }));
  const fields = fieldsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FieldDoc, "id">) }));
  const fieldNameById = new Map(fields.map((f) => [f.id, f.name]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Solicitudes del contrato</h1>
        <p className="text-sm text-muted-foreground">
          Documentos generados y solicitudes en curso de todos los campos.
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-3">
        <div className="space-y-2">
          <Label htmlFor="month">Mes</Label>
          <Input id="month" name="month" type="month" defaultValue={month} className="w-40" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fieldId">Campo</Label>
          <NativeSelect id="fieldId" name="fieldId" defaultValue={fieldId ?? ""} className="w-44">
            <option value="">Todos los campos</option>
            {fields.map((field) => (
              <option key={field.id} value={field.id}>
                {field.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
        {(month || fieldId) && (
          <Button
            type="button"
            variant="ghost"
            render={<Link href="/admin/leave-requests" />}
            nativeButton={false}
          >
            Limpiar filtro
          </Button>
        )}
      </form>

      {requests.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {month || fieldId
            ? "No hay solicitudes para los filtros seleccionados."
            : "No hay solicitudes registradas todavía."}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empleado</TableHead>
              <TableHead>Campo</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Fechas</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">PDF</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => (
              <TableRow key={request.id}>
                <TableCell className="font-medium">{request.employeeName}</TableCell>
                <TableCell className="text-muted-foreground">
                  {fieldNameById.get(request.fieldId) ?? "—"}
                </TableCell>
                <TableCell>{LEAVE_TYPE_LABEL[request.type]}</TableCell>
                <TableCell className="text-muted-foreground">
                  {formatTimestamp(request.startDate)} — {formatTimestamp(request.endDate)}
                </TableCell>
                <TableCell>
                  <LeaveRequestStatusBadge status={request.status} />
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
                  ) : request.status === "APROBADO" ? (
                    <RetryPdfButton requestId={request.id} />
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
