"use client";

import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ContractStatusBadge } from "@/components/contracts/ContractStatusBadge";
import type { ContractStatus } from "@/types/domain";

export interface ContractRow {
  id: string;
  number: string;
  name: string;
  startDate: string;
  endDate: string;
  status: ContractStatus;
}

export function ContractsTable({ contracts }: { contracts: ContractRow[] }) {
  if (contracts.length === 0) {
    return <p className="text-sm text-muted-foreground">Aún no hay contratos creados.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Número</TableHead>
          <TableHead>Nombre</TableHead>
          <TableHead>Vigencia</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {contracts.map((contract) => (
          <TableRow key={contract.id}>
            <TableCell className="font-medium">{contract.number}</TableCell>
            <TableCell>{contract.name}</TableCell>
            <TableCell className="text-muted-foreground">
              {contract.startDate} — {contract.endDate}
            </TableCell>
            <TableCell>
              <ContractStatusBadge status={contract.status} />
            </TableCell>
            <TableCell className="text-right">
              <Button
                variant="outline"
                size="sm"
                render={<Link href={`/super-admin/contracts/${contract.id}`} />}
                nativeButton={false}
              >
                Ver detalle
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
