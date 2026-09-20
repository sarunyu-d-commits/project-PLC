export type AppRole = "admin" | "technician" | "viewer";
export type MachineStatus = "running" | "stop" | "alarm" | "maintenance";
export type AlarmStatus = "open" | "in_progress" | "closed";
export type AlarmSeverity = "low" | "medium" | "high";
export type MaintenanceStatus = "pending" | "in_progress" | "waiting_part" | "done";
export type MaintenanceType = "corrective" | "preventive";
/** manual = บันทึกเอง, plc = จาก PLC Gateway, sim = จากหน้าจำลองเครื่องจักร */
export type AlarmSource = "manual" | "plc" | "sim";

export interface Profile {
  id: string;
  full_name: string;
  role: AppRole;
}

export interface Machine {
  id: string;
  machine_code: string;
  name: string;
  machine_type: string;
  location: string;
  status: MachineStatus;
  plc_linked: boolean;
  last_seen_at: string | null;
  updated_at: string;
}

export interface Alarm {
  id: string;
  machine_id: string;
  alarm_code: string;
  description: string;
  severity: AlarmSeverity;
  occurred_at: string;
  cause: string | null;
  action_taken: string | null;
  status: AlarmStatus;
  source: AlarmSource;
  closed_at: string | null;
  machine?: Pick<Machine, "machine_code" | "name"> | null;
  closer?: Pick<Profile, "full_name"> | null;
}

export interface MaintenanceRecord {
  id: string;
  machine_id: string;
  alarm_id: string | null;
  technician_id: string | null;
  maintenance_type: MaintenanceType;
  problem: string;
  action_taken: string | null;
  status: MaintenanceStatus;
  started_at: string;
  completed_at: string | null;
  machine?: Pick<Machine, "machine_code" | "name"> | null;
  technician?: Pick<Profile, "full_name"> | null;
}

/** ผลลัพธ์มาตรฐานของ Server Action ที่ส่งกลับไปให้ฟอร์ม */
export interface ActionState {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  /** ค่าที่ผู้ใช้กรอก ส่งกลับไปเติมฟอร์มเมื่อบันทึกไม่ผ่าน (React 19 รีเซ็ตฟอร์มหลัง action) */
  values?: Record<string, string>;
}

export const initialActionState: ActionState = { ok: false };
