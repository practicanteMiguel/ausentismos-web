import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth } from "@/lib/firebase/admin";
import { ROLE_HOME } from "@/lib/auth/roles";
import type { AuthClaims, Role } from "@/types/domain";

export const SESSION_COOKIE_NAME = "__session";
export const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 10; // 10 dias

export interface SessionUser extends AuthClaims {
  uid: string;
  email: string | null;
  name: string;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) return null;

  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      name: (decoded.name as string) ?? decoded.email ?? "Usuario",
      role: decoded.role as Role,
      contractId: (decoded.contractId as string) ?? null,
      fieldId: (decoded.fieldId as string) ?? null,
      supervisorId: (decoded.supervisorId as string) ?? null,
    };
  } catch {
    return null;
  }
}

export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireSessionUser();
  if (!roles.includes(user.role)) throw new ForbiddenError();
  return user;
}

export async function requireRoleOrRedirect(...roles: Role[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!roles.includes(user.role)) redirect(ROLE_HOME[user.role]);
  return user;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("No autenticado");
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor() {
    super("No autorizado para esta acción");
    this.name = "ForbiddenError";
  }
}
