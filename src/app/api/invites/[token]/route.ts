import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { validateInvite, InviteError } from "@/lib/invites/register";
import type { InviteRole } from "@/types/domain";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const expectedRole = request.nextUrl.searchParams.get("role") as InviteRole | null;

  try {
    const invite = await validateInvite(token, expectedRole ?? undefined);

    const [contractSnap, fieldSnap, supervisorSnap] = await Promise.all([
      adminDb.collection("contracts").doc(invite.contractId).get(),
      invite.fieldId ? adminDb.collection("fields").doc(invite.fieldId).get() : null,
      invite.supervisorId ? adminDb.collection("users").doc(invite.supervisorId).get() : null,
    ]);

    return NextResponse.json({
      ok: true,
      data: {
        role: invite.role,
        contractName: contractSnap.exists ? contractSnap.data()?.name : null,
        fieldName: fieldSnap?.exists ? fieldSnap.data()?.name : null,
        supervisorName: supervisorSnap?.exists ? supervisorSnap.data()?.name : null,
      },
    });
  } catch (error) {
    if (error instanceof InviteError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 410 });
    }
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}
