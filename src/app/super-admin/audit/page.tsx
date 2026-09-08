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
import { CopyButton } from "@/components/ui/copy-button";
import type { AuditLog } from "@/types/domain";

function pdfSha256(log: Pick<AuditLog, "action" | "metadata">): string | null {
  if (log.action !== "PDF_GENERATED") return null;
  const value = log.metadata?.sha256;
  return typeof value === "string" ? value : null;
}

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
                  <TableHead>SHA-256 del PDF</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const sha256 = pdfSha256(log);
                  return (
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
                      <TableCell className="text-muted-foreground">
                        {sha256 ? (
                          <div className="flex items-center gap-1">
                            <code className="truncate font-mono text-xs">
                              {sha256.slice(0, 12)}…
                            </code>
                            <CopyButton value={sha256} />
                          </div>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
