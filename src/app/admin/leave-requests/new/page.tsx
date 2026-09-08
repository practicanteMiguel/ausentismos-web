import { adminDb } from "@/lib/firebase/admin";
import { requireRoleOrRedirect } from "@/lib/auth/session";
import { LeaveRequestForm } from "@/components/forms/LeaveRequestForm";
import { ADMINISTRACION_FIELD_NAME } from "@/lib/fields/administracion";
import type { Contract, UserDoc } from "@/types/domain";

export default async function NewAdminLeaveRequestPage() {
  const admin = await requireRoleOrRedirect("admin");

  const [userSnap, contractSnap] = await Promise.all([
    adminDb.collection("users").doc(admin.uid).get(),
    adminDb.collection("contracts").doc(admin.contractId!).get(),
  ]);

  const user = userSnap.data() as Omit<UserDoc, "id">;
  const contract = contractSnap.data() as Omit<Contract, "id">;

  return (
    <div className="mx-auto max-w-6xl">
      <LeaveRequestForm
        employeeName={user.name}
        employeeCedula={user.cedula ?? ""}
        contractLabel={`${contract.number} - ${contract.name}`}
        fieldLabel={ADMINISTRACION_FIELD_NAME}
        redirectPath="/admin/leave-requests/mine"
        reviewerLabel="tu coordinador"
      />
    </div>
  );
}
