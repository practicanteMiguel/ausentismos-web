import { requireRoleOrRedirect } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/AppShell";

export default async function SupervisorLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRoleOrRedirect("supervisor");
  return (
    <AppShell role="supervisor" userName={user.name}>
      {children}
    </AppShell>
  );
}
