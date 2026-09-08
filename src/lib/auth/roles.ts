import type { Role } from "@/types/domain";

export const ROLE_HOME: Record<Role, string> = {
  "super-admin": "/super-admin",
  admin: "/admin",
  supervisor: "/supervisor",
  coordinator: "/coordinator",
  employee: "/employee",
};

export const ROLE_LABEL: Record<Role, string> = {
  "super-admin": "Super Administrador",
  admin: "Administrador de contrato",
  supervisor: "Supervisor",
  coordinator: "Coordinador",
  employee: "Empleado",
};

export function routeGroupForPath(pathname: string): Role | null {
  if (pathname.startsWith("/super-admin")) return "super-admin";
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/supervisor")) return "supervisor";
  if (pathname.startsWith("/coordinator")) return "coordinator";
  if (pathname.startsWith("/employee")) return "employee";
  return null;
}
