import { requireRoleOrRedirect } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/AppShell";

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRoleOrRedirect("employee");
  return (
    <AppShell role="employee" userName={user.name}>
      {children}
    </AppShell>
  );
}
