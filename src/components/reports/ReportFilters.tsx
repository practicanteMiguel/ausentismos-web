"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LeaveRequestStatusBadge } from "@/components/leave-requests/LeaveRequestStatusBadge";
import { LEAVE_TYPE_LABEL, type LeaveRequestStatus, type LeaveType } from "@/types/domain";
import { Download, Search } from "lucide-react";

interface ReportFiltersProps {
  fields: { id: string; name: string }[];
}

interface ReportRow {
  id: string;
  employeeName: string;
  type: LeaveType;
  status: LeaveRequestStatus;
  startDate: string;
  endDate: string;
}

// startDate/endDate son fechas de solo-día (medianoche UTC) — se fija a UTC para que el día
// mostrado no dependa de la zona horaria del navegador (ver LeaveRequestPdfPreview.tsx).
function formatIso(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    timeZone: "UTC",
  });
}

export function ReportFilters({ fields }: ReportFiltersProps) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [fieldId, setFieldId] = useState<string>("all");
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  function buildParams() {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (fieldId !== "all") params.set("fieldId", fieldId);
    return params;
  }

  async function handleSearch() {
    setLoading(true);
    try {
      const params = buildParams();
      const response = await fetch(`/api/reports?${params.toString()}`);
      const json = await response.json();
      setRows(json.data ?? []);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }

  function handleExport() {
    const params = buildParams();
    params.set("format", "csv");
    // Navegación de descarga (Content-Disposition: attachment), no una ruta de la app.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = `/api/reports?${params.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <Label htmlFor="from">Desde</Label>
          <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="to">Hasta</Label>
          <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="report-fieldId">Campo</Label>
          <NativeSelect
            id="report-fieldId"
            className="w-48"
            value={fieldId}
            onChange={(e) => setFieldId(e.target.value)}
          >
            <option value="all">Todos los campos</option>
            {fields.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <Button onClick={handleSearch} disabled={loading}>
          <Search className="size-4" />
          {loading ? "Buscando..." : "Buscar"}
        </Button>
        <Button variant="outline" onClick={handleExport}>
          <Download className="size-4" />
          Exportar CSV
        </Button>
      </div>

      {searched && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empleado</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Fechas</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                  Sin resultados para los filtros seleccionados.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.employeeName}</TableCell>
                  <TableCell>{LEAVE_TYPE_LABEL[r.type]}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatIso(r.startDate)} — {formatIso(r.endDate)}
                  </TableCell>
                  <TableCell>
                    <LeaveRequestStatusBadge status={r.status} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
