import type { Role } from "@/types/domain";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  FileStack,
  Users,
  Building2,
  ClipboardList,
  UserPlus,
  History,
  ShieldCheck,
  BarChart3,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: Record<Role, NavItem[]> = {
  "super-admin": [
    { href: "/super-admin", label: "Panel", icon: LayoutDashboard },
    { href: "/super-admin/contracts", label: "Contratos", icon: FileStack },
    { href: "/super-admin/audit", label: "Auditoría", icon: ShieldCheck },
  ],
  admin: [
    { href: "/admin", label: "Panel", icon: LayoutDashboard },
    { href: "/admin/fields", label: "Campos", icon: Building2 },
    { href: "/admin/supervisors", label: "Supervisores", icon: Users },
    { href: "/admin/leave-requests", label: "Solicitudes", icon: ClipboardList },
    { href: "/admin/leave-requests/new", label: "Nuevo ausentismo", icon: UserPlus },
    { href: "/admin/leave-requests/mine", label: "Mis ausentismos", icon: History },
    { href: "/admin/reports", label: "Reportes", icon: BarChart3 },
  ],
  supervisor: [
    { href: "/supervisor", label: "Panel", icon: LayoutDashboard },
    { href: "/supervisor/leave-requests", label: "Solicitudes", icon: ClipboardList },
    { href: "/supervisor/leave-requests/new", label: "Nuevo ausentismo", icon: UserPlus },
    { href: "/supervisor/leave-requests/mine", label: "Mis ausentismos", icon: History },
    { href: "/supervisor/employees", label: "Empleados", icon: Users },
  ],
  coordinator: [
    { href: "/coordinator", label: "Panel", icon: LayoutDashboard },
    { href: "/coordinator/leave-requests", label: "Solicitudes", icon: ClipboardList },
  ],
  employee: [
    { href: "/employee", label: "Panel", icon: LayoutDashboard },
    { href: "/employee/leave-requests/new", label: "Nuevo ausentismo", icon: UserPlus },
    { href: "/employee/leave-requests", label: "Historial", icon: History },
  ],
};
