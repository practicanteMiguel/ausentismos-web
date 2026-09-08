import Link from "next/link";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { CopyButton } from "@/components/ui/copy-button";
import { AUDIT_ACTION_LABEL, type AuditAction, type AuditLog } from "@/types/domain";

const AUDIT_ACTIONS = Object.keys(AUDIT_ACTION_LABEL) as AuditAction[];
const MAX_RESULTS = 200;
// Con filtro de usuario se trae un lote más grande antes de filtrar en memoria por nombre
// (Firestore no hace búsquedas de texto), para no perder coincidencias fuera de las primeras 200.
const MAX_RESULTS_WITH_USER_FILTER = 500;

function pdfSha256(log: Pick<AuditLog, "action" | "metadata">): string | null {
  if (log.action !== "PDF_GENERATED") return null;
  const value = log.metadata?.sha256;
  return typeof value === "string" ? value : null;
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; usuario?: string; from?: string; to?: string }>;
}) {
  const { action, usuario, from, to } = await searchParams;

  let query = adminDb.collection("auditLogs") as FirebaseFirestore.Query;
  if (action) {
    query = query.where("action", "==", action);
  }
  if (from) {
    query = query.where("createdAt", ">=", new Date(`${from}T00:00:00.000Z`));
  }
  if (to) {
    const toExclusive = new Date(`${to}T00:00:00.000Z`);
    toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);
    query = query.where("createdAt", "<", toExclusive);
  }
  query = query.orderBy("createdAt", "desc").limit(usuario ? MAX_RESULTS_WITH_USER_FILTER : MAX_RESULTS);

  const snap = await query.get();
  let logs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AuditLog, "id">) }));

  if (usuario) {
    const needle = usuario.trim().toLowerCase();
    logs = logs.filter((log) => log.actorName.toLowerCase().includes(needle)).slice(0, MAX_RESULTS);
  }

  const hasFilters = Boolean(action || usuario || from || to);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Auditoría general</h1>
        <p className="text-sm text-muted-foreground">
          {hasFilters
            ? `${logs.length} evento${logs.length === 1 ? "" : "s"} para los filtros seleccionados.`
            : "Últimas 200 acciones registradas en toda la plataforma."}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registro</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <Label htmlFor="action">Acción</Label>
              <NativeSelect id="action" name="action" defaultValue={action ?? ""} className="w-52">
                <option value="">Todas las acciones</option>
                {AUDIT_ACTIONS.map((a) => (
                  <option key={a} value={a}>
                    {AUDIT_ACTION_LABEL[a]}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="usuario">Usuario</Label>
              <Input
                id="usuario"
                name="usuario"
                placeholder="Nombre del usuario"
                defaultValue={usuario}
                className="w-44"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="from">Desde</Label>
              <Input id="from" name="from" type="date" defaultValue={from} className="w-40" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="to">Hasta</Label>
              <Input id="to" name="to" type="date" defaultValue={to} className="w-40" />
            </div>
            <Button type="submit" variant="outline">
              Filtrar
            </Button>
            {hasFilters && (
              <Button
                type="button"
                variant="ghost"
                render={<Link href="/super-admin/audit" />}
                nativeButton={false}
              >
                Limpiar filtros
              </Button>
            )}
          </form>

          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {hasFilters
                ? "No hay eventos para los filtros seleccionados."
                : "Aún no hay eventos registrados."}
            </p>
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
                        <Badge variant="outline">{AUDIT_ACTION_LABEL[log.action] ?? log.action}</Badge>
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
