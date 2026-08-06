import { Badge, type badgeVariants } from "@/components/ui/badge";
import type { ContractStatus } from "@/types/domain";
import type { VariantProps } from "class-variance-authority";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

const VARIANT: Record<ContractStatus, BadgeVariant> = {
  ACTIVO: "success",
  VENCIDO: "destructive",
  SUSPENDIDO: "warning",
};

const LABEL: Record<ContractStatus, string> = {
  ACTIVO: "Activo",
  VENCIDO: "Vencido",
  SUSPENDIDO: "Suspendido",
};

export function ContractStatusBadge({ status }: { status: ContractStatus }) {
  return <Badge variant={VARIANT[status]}>{LABEL[status]}</Badge>;
}
