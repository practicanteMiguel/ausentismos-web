import { requireRoleOrRedirect } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/AppShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRoleOrRedirect("admin");
  return (
    <AppShell role="admin" userName={user.name}>
      {children}
    </AppShell>
  );
}
