import { adminDb } from "@/lib/firebase/admin";
import { formatInstant } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AuditLog } from "@/types/domain";

export default async function AuditPage() {
  const snap = await adminDb.collection("auditLogs").orderBy("createdAt", "desc").limit(200).get();
  const logs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AuditLog, "id">) }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Auditoría general</h1>
        <p className="text-sm text-muted-foreground">
          Últimas 200 acciones registradas en toda la plataforma.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registro</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay eventos registrados.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Acción</TableHead>
                  <TableHead>Entidad</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatInstant(log.createdAt)}
                    </TableCell>
                    <TableCell className="font-medium">{log.actorName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.action}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {log.entityType}/{log.entityId.slice(0, 8)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{log.ip ?? "—"}</TableCell>
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
