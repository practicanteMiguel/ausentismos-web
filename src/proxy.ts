import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

const PROTECTED_PREFIXES = ["/super-admin", "/admin", "/supervisor", "/employee"];

// El Proxy (edge) solo verifica presencia de cookie (verifySessionCookie usa Node crypto,
// no disponible en el runtime edge). La verificación real + chequeo de rol ocurre en cada
// layout de route group vía requireRole() (Server Component, runtime Node.js).

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const hasSession = request.cookies.has(SESSION_COOKIE_NAME);
  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/super-admin/:path*", "/admin/:path*", "/supervisor/:path*", "/employee/:path*"],
};
