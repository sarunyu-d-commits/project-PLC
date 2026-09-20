import type { AlarmSeverity, MachineStatus } from "@/lib/types";

export type SimAction = "start" | "stop" | "maintenance" | "fault";

export const SIM_ACTION_LABEL: Record<SimAction, string> = {
  start: "เดินเครื่อง",
  stop: "หยุดเครื่อง",
  maintenance: "เข้าซ่อม",
  fault: "จำลอง Fault",
};

export interface FaultPreset {
  code: string;
  description: string;
  severity: AlarmSeverity;
}

/** Fault ที่เลือกจำลองได้ (รหัสต้องตรงรูปแบบ alarm_code ในฐานข้อมูล) */
export const FAULT_PRESETS: FaultPreset[] = [
  { code: "E-STOP", description: "กดปุ่มหยุดฉุกเฉิน", severity: "high" },
  { code: "OVERLOAD", description: "มอเตอร์ทำงานเกินกำลัง", severity: "high" },
  { code: "OVERHEAT", description: "อุณหภูมิเกินค่าที่กำหนด", severity: "medium" },
  { code: "SENSOR-FAIL", description: "สัญญาณเซนเซอร์ขาดหาย", severity: "medium" },
  { code: "LOW-PRESSURE", description: "แรงดันลมหรือไฮดรอลิกต่ำ", severity: "low" },
];

export function findFault(code: string | null | undefined): FaultPreset | undefined {
  return FAULT_PRESETS.find((f) => f.code === code);
}

export interface SimMachineState {
  status: MachineStatus;
  plcLinked: boolean;
  openAlarms: number;
}

/**
 * คืนเหตุผลที่ทำไม่ได้ หรือ null ถ้าทำได้
 * ใช้ทั้งฝั่งหน้าจอ (ปิดปุ่ม) และฝั่ง server (ตรวจซ้ำก่อนบันทึก)
 */
export function checkSimAction(action: SimAction, m: SimMachineState): string | null {
  if (m.plcLinked) return "เครื่องนี้รับสถานะจาก PLC Gateway จำลองจากหน้านี้ไม่ได้";
  switch (action) {
    case "start":
      if (m.openAlarms > 0) return "ปิด Alarm ที่ค้างอยู่ก่อนเดินเครื่อง";
      if (m.status === "running") return "เครื่องเดินอยู่แล้ว";
      return null;
    case "stop":
      if (m.openAlarms > 0) return "เครื่องมี Alarm ค้าง สถานะจะเป็น Alarm จนกว่าจะปิด";
      if (m.status === "stop") return "เครื่องหยุดอยู่แล้ว";
      return null;
    case "maintenance":
      if (m.status === "maintenance") return "เครื่องอยู่ระหว่างซ่อมแล้ว";
      return null;
    case "fault":
      return null;
  }
}

export const SIM_TARGET_STATUS: Record<Exclude<SimAction, "fault">, MachineStatus> = {
  start: "running",
  stop: "stop",
  maintenance: "maintenance",
};
