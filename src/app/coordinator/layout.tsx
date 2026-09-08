import { requireRoleOrRedirect } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/AppShell";

export default async function CoordinatorLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRoleOrRedirect("coordinator");
  return (
    <AppShell role="coordinator" userName={user.name}>
      {children}
    </AppShell>
  );
}
