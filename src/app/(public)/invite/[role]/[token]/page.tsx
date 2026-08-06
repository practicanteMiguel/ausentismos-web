import { notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { validateInvite, InviteError } from "@/lib/invites/register";
import { InviteRegisterForm } from "@/components/forms/InviteRegisterForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { InviteRole } from "@/types/domain";

const VALID_ROLES: InviteRole[] = ["admin", "supervisor", "employee"];

interface InviteData {
  role: InviteRole;
  contractName: string;
  fieldName: string | null;
  supervisorName: string | null;
}

async function loadInvite(
  token: string,
  role: InviteRole
): Promise<{ ok: true; data: InviteData } | { ok: false; error: string }> {
  try {
    const invite = await validateInvite(token, role);
    const [contractSnap, fieldSnap, supervisorSnap] = await Promise.all([
      adminDb.collection("contracts").doc(invite.contractId).get(),
      invite.fieldId ? adminDb.collection("fields").doc(invite.fieldId).get() : Promise.resolve(null),
      invite.supervisorId
        ? adminDb.collection("users").doc(invite.supervisorId).get()
        : Promise.resolve(null),
    ]);

    return {
      ok: true,
      data: {
        role: invite.role,
        contractName: (contractSnap.data()?.name as string) ?? "—",
        fieldName: (fieldSnap?.data()?.name as string) ?? null,
        supervisorName: (supervisorSnap?.data()?.name as string) ?? null,
      },
    };
  } catch (error) {
    return { ok: false, error: error instanceof InviteError ? error.message : "Enlace inválido." };
  }
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ role: string; token: string }>;
}) {
  const { role, token } = await params;
  if (!VALID_ROLES.includes(role as InviteRole)) notFound();

  const result = await loadInvite(token, role as InviteRole);

  if (!result.ok) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Enlace no disponible</CardTitle>
          <CardDescription>{result.error}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Solicita un nuevo enlace de invitación a quien te lo compartió.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <InviteRegisterForm
      role={result.data.role}
      token={token}
      contractName={result.data.contractName}
      fieldName={result.data.fieldName}
      supervisorName={result.data.supervisorName}
    />
  );
}
