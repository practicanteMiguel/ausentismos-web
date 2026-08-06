import Link from "next/link";
import { notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { formatTimestamp } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ContractStatusBadge } from "@/components/contracts/ContractStatusBadge";
import { RegenerateAdminInvite } from "@/components/contracts/RegenerateAdminInvite";
import { ArrowLeft } from "lucide-react";
import type { Contract, FieldDoc } from "@/types/domain";

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [contractSnap, fieldsSnap] = await Promise.all([
    adminDb.collection("contracts").doc(id).get(),
    adminDb.collection("fields").where("contractId", "==", id).get(),
  ]);

  if (!contractSnap.exists) notFound();
  const contract = contractSnap.data() as Omit<Contract, "id">;
  const fields = fieldsSnap.docs.map((d) => d.data() as Omit<FieldDoc, "id">);

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        render={<Link href="/super-admin/contracts" />}
        nativeButton={false}
      >
        <ArrowLeft className="size-4" />
        Volver a contratos
      </Button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            {contract.name} <span className="text-muted-foreground">#{contract.number}</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            {formatTimestamp(contract.startDate)} — {formatTimestamp(contract.endDate)}
          </p>
        </div>
        <ContractStatusBadge status={contract.status} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invitación de administrador</CardTitle>
          </CardHeader>
          <CardContent>
            <RegenerateAdminInvite contractId={id} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Almacenamiento en Drive</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {contract.driveFolderId
              ? "Carpeta creada correctamente en Google Drive."
              : "La carpeta aún no se ha creado. Se creará automáticamente al generar el primer PDF."}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Campos ({fields.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {fields.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              El administrador aún no ha creado campos en este contrato.
            </p>
          ) : (
            <ul className="space-y-2">
              {fields.map((field) => (
                <li key={field.name} className="text-sm">
                  {field.name}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
