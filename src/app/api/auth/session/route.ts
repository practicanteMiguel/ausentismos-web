import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuth } from "@/lib/firebase/admin";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_MS } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit/log";
import { getClientIp } from "@/lib/http/ip";

const bodySchema = z.object({ idToken: z.string().min(1) });

export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "idToken inválido" }, { status: 400 });
  }

  const { idToken } = parsed.data;

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(idToken);
  } catch {
    return NextResponse.json({ ok: false, error: "Token inválido o expirado" }, { status: 401 });
  }

  const sessionCookie = await adminAuth.createSessionCookie(idToken, {
    expiresIn: SESSION_MAX_AGE_MS,
  });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_MS / 1000,
    path: "/",
  });

  await logAudit({
    contractId: (decoded.contractId as string) ?? null,
    actorUid: decoded.uid,
    actorName: (decoded.name as string) ?? decoded.email ?? "Usuario",
    action: "LOGIN",
    entityType: "user",
    entityId: decoded.uid,
    ip: getClientIp(request),
    userAgent: request.headers.get("user-agent"),
    metadata: {},
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
