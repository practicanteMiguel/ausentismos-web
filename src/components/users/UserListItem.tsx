import { Badge } from "@/components/ui/badge";
import { ResetPasswordDialog } from "@/components/users/ResetPasswordDialog";
import type { UserStatus } from "@/types/domain";

interface UserListItemProps {
  uid: string;
  name: string;
  email: string;
  cedula?: string | null;
  status: UserStatus;
}

export function UserListItem({ uid, name, email, cedula, status }: UserListItemProps) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {email}
          {cedula ? ` · CC ${cedula}` : ""}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Badge variant={status === "ACTIVO" ? "success" : "outline"}>
          {status === "ACTIVO" ? "Activo" : "Inactivo"}
        </Badge>
        <ResetPasswordDialog uid={uid} userName={name} />
      </div>
    </li>
  );
}
