import type { AlarmStatus, AppRole } from "@/lib/types";

const TRANSITIONS: Record<AlarmStatus, AlarmStatus[]> = {
  open: ["open", "in_progress", "closed"],
  in_progress: ["in_progress", "open", "closed"],
  closed: ["closed", "open"], // เปิดใหม่ได้เฉพาะ admin (ตรวจด้านล่าง)
};

export interface AlarmUpdateInput {
  from: AlarmStatus;
  to: AlarmStatus;
  role: AppRole;
  cause?: string | null;
  actionTaken?: string | null;
}

/** คืนข้อความ error ถ้าเปลี่ยนสถานะไม่ได้, คืน null ถ้าผ่าน (กฎเดียวกับ trigger ในฐานข้อมูล) */
export function checkAlarmUpdate(input: AlarmUpdateInput): string | null {
  const { from, to, role } = input;
  if (role === "viewer") return "Viewer แก้ไข Alarm ไม่ได้";
  if (!TRANSITIONS[from].includes(to)) return `เปลี่ยนสถานะจาก ${from} เป็น ${to} ไม่ได้`;
  if (from === "closed" && to !== "closed" && role !== "admin") {
    return "Alarm ที่ปิดแล้ว เปิดใหม่ได้เฉพาะ Admin";
  }
  if (from === "closed" && to === "closed") return "Alarm ที่ปิดแล้วแก้ไขไม่ได้ ต้องเปิดใหม่ก่อน";
  if (to === "closed") {
    if (!input.cause?.trim()) return "ต้องระบุสาเหตุ (Cause) ก่อนปิด Alarm";
    if (!input.actionTaken?.trim()) return "ต้องระบุการแก้ไข (Action Taken) ก่อนปิด Alarm";
  }
  return null;
}

export function allowedNextStatuses(from: AlarmStatus, role: AppRole): AlarmStatus[] {
  if (role === "viewer") return [from];
  if (from === "closed") return role === "admin" ? ["open"] : [];
  return TRANSITIONS[from];
}
