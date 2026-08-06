import { Badge, type badgeVariants } from "@/components/ui/badge";
import { LEAVE_REQUEST_STATUS_LABEL, type LeaveRequestStatus } from "@/types/domain";
import type { VariantProps } from "class-variance-authority";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

const VARIANT: Record<LeaveRequestStatus, BadgeVariant> = {
  BORRADOR: "outline",
  ENVIADO: "info",
  PENDIENTE_SUPERVISOR: "warning",
  RECHAZADO: "destructive",
  APROBADO: "success",
  PDF_GENERADO: "success",
  FINALIZADO: "success",
};

export function LeaveRequestStatusBadge({ status }: { status: LeaveRequestStatus }) {
  return <Badge variant={VARIANT[status]}>{LEAVE_REQUEST_STATUS_LABEL[status]}</Badge>;
}
