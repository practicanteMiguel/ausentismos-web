import {
  FilePlus2,
  Send,
  CheckCircle2,
  XCircle,
  FileText,
  Download,
  FileStack,
  Building2,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import type { ActivityType } from "@/types/domain";
import type { StatColor } from "@/components/dashboards/StatCard";

export const ACTIVITY_ICON: Record<ActivityType, LucideIcon> = {
  LEAVE_REQUEST_CREATED: FilePlus2,
  LEAVE_REQUEST_SUBMITTED: Send,
  LEAVE_REQUEST_APPROVED: CheckCircle2,
  LEAVE_REQUEST_REJECTED: XCircle,
  PDF_GENERATED: FileText,
  PDF_DOWNLOADED: Download,
  CONTRACT_CREATED: FileStack,
  FIELD_CREATED: Building2,
  USER_REGISTERED: UserPlus,
};

export const ACTIVITY_COLOR: Record<ActivityType, StatColor> = {
  LEAVE_REQUEST_CREATED: "info",
  LEAVE_REQUEST_SUBMITTED: "primary",
  LEAVE_REQUEST_APPROVED: "success",
  LEAVE_REQUEST_REJECTED: "destructive",
  PDF_GENERATED: "violet",
  PDF_DOWNLOADED: "info",
  CONTRACT_CREATED: "primary",
  FIELD_CREATED: "warning",
  USER_REGISTERED: "success",
};
