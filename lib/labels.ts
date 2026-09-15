import type {
  AlarmSeverity,
  AlarmStatus,
  AppRole,
  MachineStatus,
  MaintenanceStatus,
  MaintenanceType,
} from "./types";

export const MACHINE_STATUS_LABEL: Record<MachineStatus, string> = {
  running: "Running",
  stop: "Stop",
  alarm: "Alarm",
  maintenance: "Maintenance",
};

export const ALARM_STATUS_LABEL: Record<AlarmStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  closed: "Closed",
};

export const SEVERITY_LABEL: Record<AlarmSeverity, string> = {
  low: "ต่ำ",
  medium: "กลาง",
  high: "สูง",
};

export const MAINT_STATUS_LABEL: Record<MaintenanceStatus, string> = {
  pending: "รอดำเนินการ",
  in_progress: "กำลังซ่อม",
  waiting_part: "รออะไหล่",
  done: "เสร็จแล้ว",
};

export const MAINT_TYPE_LABEL: Record<MaintenanceType, string> = {
  corrective: "ซ่อมแก้ไข",
  preventive: "บำรุงรักษาเชิงป้องกัน",
};

export const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Admin",
  technician: "Technician",
  viewer: "Viewer",
};

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "–";
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(new Date(value));
}
