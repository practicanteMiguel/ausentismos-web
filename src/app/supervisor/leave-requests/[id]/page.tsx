import Link from "next/link";
import { notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { requireRoleOrRedirect } from "@/lib/auth/session";
import { ReviewPanel } from "@/components/leave-requests/ReviewPanel";
import { RetryPdfButton } from "@/components/leave-requests/RetryPdfButton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toLeaveRequestView } from "@/lib/leaveRequests/viewModel";
import type { Contract, FieldDoc, LeaveRequest } from "@/types/domain";

export default async function SupervisorLeaveRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supervisor = await requireRoleOrRedirect("supervisor");
  const { id } = await params;
  const snap = await adminDb.collection("leaveRequests").doc(id).get();
  if (!snap.exists) notFound();
  const request = { id: snap.id, ...(snap.data() as Omit<LeaveRequest, "id">) };
  if (request.supervisorId !== supervisor.uid) notFound();

  const [fieldSnap, contractSnap] = await Promise.all([
    adminDb.collection("fields").doc(request.fieldId).get(),
    adminDb.collection("contracts").doc(request.contractId).get(),
  ]);
  const fieldName = (fieldSnap.data() as FieldDoc | undefined)?.name ?? "";
  const contract = contractSnap.data() as Omit<Contract, "id"> | undefined;
  const contractLabel = contract ? `${contract.number} - ${contract.name}` : "";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Button
        variant="ghost"
        size="sm"
        render={<Link href="/supervisor/leave-requests" />}
        nativeButton={false}
      >
        <ArrowLeft className="size-4" />
        Volver a solicitudes
      </Button>
      <ReviewPanel request={toLeaveRequestView(request)} contractLabel={contractLabel} fieldLabel={fieldName} />
      {request.status === "APROBADO" && !request.pdf && <RetryPdfButton requestId={request.id} />}
    </div>
  );
}
