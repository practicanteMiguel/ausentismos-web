import { adminDb } from "@/lib/firebase/admin";
import { formatTimestamp } from "@/lib/format";
import { ContractsTable, type ContractRow } from "@/components/contracts/ContractsTable";
import { ContractForm } from "@/components/forms/ContractForm";
import type { Contract } from "@/types/domain";

export default async function ContractsPage() {
  const snap = await adminDb.collection("contracts").orderBy("createdAt", "desc").get();
  const contracts: ContractRow[] = snap.docs.map((d) => {
    const data = d.data() as Omit<Contract, "id">;
    return {
      id: d.id,
      number: data.number,
      name: data.name,
      status: data.status,
      startDate: formatTimestamp(data.startDate),
      endDate: formatTimestamp(data.endDate),
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Contratos</h1>
          <p className="text-sm text-muted-foreground">
            Administra los contratos y sus administradores asociados.
          </p>
        </div>
        <ContractForm />
      </div>
      <ContractsTable contracts={contracts} />
    </div>
  );
}
