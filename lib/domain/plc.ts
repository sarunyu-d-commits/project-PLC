import type { MachineStatus } from "@/lib/types";

/**
 * แปลงค่าจาก PLC เป็นสถานะเครื่อง (ต้องตรงกับ gateway/plc_gateway.py)
 * M0 = PWR, M1 = RUN, M2 = STOP, M3 = ERR
 * ลำดับความสำคัญ: ERR > RUN > STOP  (เครื่องที่ Error ต้องแสดง Alarm เสมอ)
 */
export function plcToMachineStatus(bits: { M0: number; M1: number; M3: number }): MachineStatus {
  if (bits.M3 === 1) return "alarm";
  if (bits.M0 === 1 && bits.M1 === 1) return "running";
  return "stop";
}

/** ข้อมูลจาก gateway ถือว่าเก่าถ้าไม่อัปเดตเกินเวลาที่กำหนด */
export function isStale(lastSeenAt: string | null, now: Date = new Date(), maxAgeSec = 30): boolean {
  if (!lastSeenAt) return true;
  return now.getTime() - new Date(lastSeenAt).getTime() > maxAgeSec * 1000;
}
