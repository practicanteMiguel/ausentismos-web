import { requireRoleOrRedirect } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/AppShell";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRoleOrRedirect("super-admin");
  return (
    <AppShell role="super-admin" userName={user.name}>
      {children}
    </AppShell>
  );
}
