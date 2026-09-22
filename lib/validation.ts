import { z } from "zod";
import type { ActionState } from "@/lib/types";

const required = (label: string, max: number) =>
  z
    .string({ error: `กรุณากรอก${label}` })
    .trim()
    .min(1, `กรุณากรอก${label}`)
    .max(max, `${label}ยาวได้ไม่เกิน ${max} ตัวอักษร`);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `ยาวได้ไม่เกิน ${max} ตัวอักษร`)
    .optional()
    .transform((v) => (v ? v : null));

/** datetime-local ("2026-09-15T10:30") ถือเป็นเวลาไทย แปลงเป็น ISO */
export function localDateTimeToIso(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const d = new Date(`${value}:00+07:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export const machineSchema = z.object({
  machine_code: z
    .string({ error: "กรุณากรอก Machine ID" })
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9][A-Z0-9-]{1,19}$/, "Machine ID ใช้ได้เฉพาะ A-Z, 0-9 และ - ยาว 2–20 ตัว เช่น CNC-01"),
  name: required("ชื่อเครื่อง", 100),
  machine_type: required("ประเภทเครื่อง", 50),
  location: required("ตำแหน่ง", 100),
  status: z.enum(["running", "stop", "alarm", "maintenance"], { error: "สถานะไม่ถูกต้อง" }),
  plc_linked: z
    .union([z.literal("on"), z.literal("")])
    .optional()
    .transform((v) => v === "on"),
});

export const alarmCreateSchema = z.object({
  machine_id: z.uuid({ error: "กรุณาเลือกเครื่องจักร" }),
  alarm_code: z
    .string({ error: "กรุณากรอก Alarm Code" })
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9][A-Z0-9_-]{1,19}$/, "Alarm Code ใช้ได้เฉพาะ A-Z, 0-9, _ และ - ยาว 2–20 ตัว"),
  description: required("รายละเอียด", 500),
  severity: z.enum(["low", "medium", "high"], { error: "ระดับความรุนแรงไม่ถูกต้อง" }),
  occurred_at: z
    .string({ error: "กรุณาระบุวันเวลา" })
    .transform((v, ctx) => {
      const iso = localDateTimeToIso(v);
      if (!iso) {
        ctx.addIssue({ code: "custom", message: "รูปแบบวันเวลาไม่ถูกต้อง" });
        return z.NEVER;
      }
      if (new Date(iso).getTime() > Date.now() + 5 * 60_000) {
        ctx.addIssue({ code: "custom", message: "วันเวลาเกิด Alarm ต้องไม่อยู่ในอนาคต" });
        return z.NEVER;
      }
      return iso;
    }),
  cause: optionalText(500),
});

export const alarmUpdateSchema = z.object({
  status: z.enum(["open", "in_progress", "closed"], { error: "สถานะไม่ถูกต้อง" }),
  cause: optionalText(500),
  action_taken: optionalText(1000),
});

export const maintenanceSchema = z
  .object({
    machine_id: z.uuid({ error: "กรุณาเลือกเครื่องจักร" }),
    alarm_id: z
      .union([z.uuid(), z.literal("")])
      .optional()
      .transform((v) => (v ? v : null)),
    technician_id: z
      .union([z.uuid(), z.literal("")])
      .optional()
      .transform((v) => (v ? v : null)),
    maintenance_type: z.enum(["corrective", "preventive"], { error: "ประเภทงานไม่ถูกต้อง" }),
    problem: required("ปัญหาที่พบ", 1000),
    action_taken: optionalText(1000),
    status: z.enum(["pending", "in_progress", "waiting_part", "done"], { error: "สถานะไม่ถูกต้อง" }),
  })
  .refine((v) => v.status !== "done" || !!v.action_taken, {
    path: ["action_taken"],
    message: "ต้องระบุการแก้ไขก่อนปิดงานเป็น 'เสร็จแล้ว'",
  });

export const roleSchema = z.object({
  user_id: z.uuid(),
  role: z.enum(["admin", "technician", "viewer"], { error: "Role ไม่ถูกต้อง" }),
});

export const loginSchema = z.object({
  email: z.email({ error: "รูปแบบอีเมลไม่ถูกต้อง" }),
  password: z.string().min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"),
});

export function formDataToObject(formData: FormData): Record<string, string> {
  const obj: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") obj[key] = value;
  }
  return obj;
}

/** ใส่ค่าที่ผู้ใช้กรอก (ยกเว้นรหัสผ่าน) กลับไปใน state ที่ไม่สำเร็จ */
export function withValues(state: ActionState, formData: FormData): ActionState {
  if (state.ok) return state;
  const values = formDataToObject(formData);
  delete values.password;
  for (const key of Object.keys(values)) if (key.startsWith("$ACTION")) delete values[key];
  return { ...state, values };
}

export function toFieldErrors(error: z.ZodError): ActionState {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return { ok: false, message: "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบช่องที่ขึ้นสีแดง", fieldErrors };
}

/** แปลง error จาก Postgres/Supabase เป็นข้อความที่ผู้ใช้เข้าใจ */
export function dbErrorMessage(error: { code?: string; message?: string }): string {
  const msg = error.message ?? "";
  switch (error.code) {
    case "23505":
      if (msg.includes("machine_code")) return "Machine ID นี้มีอยู่แล้ว";
      return "ข้อมูลนี้มีอยู่แล้ว";
    case "23503":
      return "ลบไม่ได้ เพราะเครื่องนี้มีประวัติ Alarm หรืองานซ่อมอยู่";
    case "23514":
      if (msg.includes("admin")) return "ต้องมี Admin อย่างน้อย 1 คนในระบบ";
      if (msg.includes("open alarms"))
        return "เครื่องนี้มี Alarm ที่ยังไม่ปิด ตั้งสถานะเป็น Running หรือ Stop ไม่ได้ ให้ปิด Alarm ก่อน";
      return "ข้อมูลไม่ผ่านเงื่อนไขของระบบ";
    case "42501":
      return "คุณไม่มีสิทธิ์ทำรายการนี้";
    default:
      return "บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
  }
}
