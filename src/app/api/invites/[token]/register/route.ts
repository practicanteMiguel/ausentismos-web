import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { registerFromInvite, InviteError } from "@/lib/invites/register";
import { getClientIp } from "@/lib/http/ip";

const bodySchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(200),
  cedula: z.string().min(4).max(30).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Datos inválidos" }, { status: 400 });
  }

  try {
    const { customToken, role } = await registerFromInvite({
      token,
      name: parsed.data.name,
      email: parsed.data.email,
      password: parsed.data.password,
      cedula: parsed.data.cedula ?? null,
      ip: getClientIp(request),
      userAgent: request.headers.get("user-agent"),
    });
    return NextResponse.json({ ok: true, data: { customToken, role } });
  } catch (error) {
    if (error instanceof InviteError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 410 });
    }
    if (error instanceof Error && "code" in error && error.code === "auth/email-already-exists") {
      return NextResponse.json(
        { ok: false, error: "Ese correo ya está registrado." },
        { status: 409 }
      );
    }
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}
