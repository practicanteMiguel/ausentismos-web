"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, type NavItem } from "@/components/layout/nav-items";
import { ROLE_LABEL } from "@/lib/auth/roles";
import type { Role } from "@/types/domain";
import { UserMenu } from "@/components/layout/UserMenu";
import { ActivityBell } from "@/components/activity-center/ActivityBell";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface AppShellProps {
  role: Role;
  userName: string;
  children: React.ReactNode;
}

function SidebarLogo() {
  return (
    <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5">
      <div className="flex h-9 w-24 items-center justify-center rounded-lg bg-white px-2 py-1">
        <Image
          src="/assets/img/logo-sas.png"
          alt="SAS"
          width={140}
          height={58}
          className="h-full w-auto object-contain"
        />
      </div>
      <span className="text-sm font-semibold text-sidebar-foreground">Ausentismos</span>
    </div>
  );
}

function SidebarNav({
  role,
  items,
  activeHref,
  onNavigate,
}: {
  role: Role;
  items: NavItem[];
  activeHref: string | undefined;
  onNavigate?: () => void;
}) {
  return (
    <>
      <nav className="flex-1 space-y-1 p-3">
        {items.map((item) => {
          const active = item.href === activeHref;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border p-3 text-xs text-sidebar-foreground/60">
        {ROLE_LABEL[role]}
      </div>
    </>
  );
}

export function AppShell({ role, userName, children }: AppShellProps) {
  const pathname = usePathname();
  const items = NAV_ITEMS[role];
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Varios items pueden ser prefijo unos de otros (ej. "/employee/leave-requests" es
  // prefijo de "/employee/leave-requests/new"). Solo se resalta la coincidencia más
  // específica (el href más largo que matchea), nunca todas las que matchean a la vez.
  const activeItem = items
    .filter((item) => pathname === item.href || pathname.startsWith(item.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0];

  const HeaderIcon = activeItem?.icon;

  return (
    <div className="flex min-h-0 flex-1">
      <aside className="hidden w-64 shrink-0 flex-col overflow-y-auto bg-sidebar text-sidebar-foreground md:flex">
        <SidebarLogo />
        <SidebarNav role={role} items={items} activeHref={activeItem?.href} />
      </aside>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent
          side="left"
          className="w-64 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
        >
          <SheetHeader className="h-16 flex-row items-center gap-2 border-b border-sidebar-border px-5">
            <div className="flex h-9 w-24 items-center justify-center rounded-lg bg-white px-2 py-1">
              <Image
                src="/assets/img/logo-sas.png"
                alt="SAS"
                width={140}
                height={58}
                className="h-full w-auto object-contain"
              />
            </div>
            <SheetTitle className="text-sidebar-foreground">Ausentismos</SheetTitle>
          </SheetHeader>
          <div className="flex flex-1 flex-col overflow-y-auto">
            <SidebarNav
              role={role}
              items={items}
              activeHref={activeItem?.href}
              onNavigate={() => setMobileNavOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b bg-card px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Abrir menú"
            >
              <Menu className="size-5" />
            </Button>
            {HeaderIcon && (
              <div className="hidden size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:flex">
                <HeaderIcon className="size-5" />
              </div>
            )}
            <h1 className="truncate text-base font-semibold text-foreground md:text-lg">
              {activeItem?.label ?? "Ausentismos"}
            </h1>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-3">
            <ActivityBell />
            <UserMenu userName={userName} role={role} />
          </div>
        </header>
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-muted/30 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
