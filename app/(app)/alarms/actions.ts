"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { checkAlarmUpdate } from "@/lib/domain/alarm";
import { createClient } from "@/lib/supabase/server";
import {
  alarmCreateSchema,
  alarmUpdateSchema,
  dbErrorMessage,
  formDataToObject,
  toFieldErrors,
} from "@/lib/validation";
import { withValues } from "@/lib/validation";
import type { ActionState, AlarmStatus } from "@/lib/types";

async function createAlarmImpl(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const profile = await requireRole(["admin", "technician"]);
  const parsed = alarmCreateSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return toFieldErrors(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase
    .from("alarms")
    .insert({ ...parsed.data, created_by: profile.id, source: "manual" });
  if (error) return { ok: false, message: dbErrorMessage(error) };

  revalidatePath("/alarms");
  revalidatePath("/dashboard");
  return { ok: true, message: `บันทึก Alarm ${parsed.data.alarm_code} แล้ว` };
}

async function updateAlarmImpl(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const profile = await requireRole(["admin", "technician"]);
  const parsed = alarmUpdateSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return toFieldErrors(parsed.error);

  const supabase = await createClient();
  const { data: current } = await supabase.from("alarms").select("status").eq("id", id).maybeSingle();
  if (!current) return { ok: false, message: "ไม่พบ Alarm นี้" };

  const ruleError = checkAlarmUpdate({
    from: current.status as AlarmStatus,
    to: parsed.data.status,
    role: profile.role,
    cause: parsed.data.cause,
    actionTaken: parsed.data.action_taken,
  });
  if (ruleError) {
    const field = ruleError.includes("Cause") ? "cause" : ruleError.includes("Action") ? "action_taken" : "status";
    return { ok: false, message: ruleError, fieldErrors: { [field]: ruleError } };
  }

  const { data, error } = await supabase.from("alarms").update(parsed.data).eq("id", id).select("id");
  if (error) return { ok: false, message: dbErrorMessage(error) };
  if (!data?.length) return { ok: false, message: "คุณไม่มีสิทธิ์แก้ไข Alarm นี้" };

  revalidatePath("/alarms");
  revalidatePath(`/alarms/${id}`);
  revalidatePath("/dashboard");
  return { ok: true, message: "อัปเดต Alarm แล้ว" };
}

export async function createAlarm(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return withValues(await createAlarmImpl(_prev, formData), formData);
}

export async function updateAlarm(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  return withValues(await updateAlarmImpl(id, _prev, formData), formData);
}
