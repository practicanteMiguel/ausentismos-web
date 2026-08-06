import { adminDb } from "@/lib/firebase/admin";
import { requireRoleOrRedirect } from "@/lib/auth/session";
import { LeaveRequestForm } from "@/components/forms/LeaveRequestForm";
import type { Contract, FieldDoc, UserDoc } from "@/types/domain";

export default async function NewLeaveRequestPage() {
  const employee = await requireRoleOrRedirect("employee");

  const [userSnap, contractSnap, fieldSnap] = await Promise.all([
    adminDb.collection("users").doc(employee.uid).get(),
    adminDb.collection("contracts").doc(employee.contractId!).get(),
    adminDb.collection("fields").doc(employee.fieldId!).get(),
  ]);

  const user = userSnap.data() as Omit<UserDoc, "id">;
  const contract = contractSnap.data() as Omit<Contract, "id">;
  const field = fieldSnap.data() as Omit<FieldDoc, "id">;

  return (
    <div className="mx-auto max-w-6xl">
      <LeaveRequestForm
        employeeName={user.name}
        employeeCedula={user.cedula ?? ""}
        contractLabel={`${contract.number} - ${contract.name}`}
        fieldLabel={field.name}
      />
    </div>
  );
}
