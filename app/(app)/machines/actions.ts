"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbErrorMessage, formDataToObject, machineSchema, toFieldErrors } from "@/lib/validation";
import { withValues } from "@/lib/validation";
import type { ActionState } from "@/lib/types";

async function createMachineImpl(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(["admin"]);
  const parsed = machineSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return toFieldErrors(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.from("machines").insert(parsed.data);
  if (error) {
    const message = dbErrorMessage(error);
    return error.code === "23505"
      ? { ok: false, message, fieldErrors: { machine_code: message } }
      : { ok: false, message };
  }
  revalidatePath("/machines");
  revalidatePath("/dashboard");
  return { ok: true, message: `เพิ่มเครื่อง ${parsed.data.machine_code} แล้ว` };
}

async function updateMachineImpl(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(["admin"]);
  const parsed = machineSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return toFieldErrors(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase.from("machines").update(parsed.data).eq("id", id).select("id");
  if (error) {
    const message = dbErrorMessage(error);
    return error.code === "23505"
      ? { ok: false, message, fieldErrors: { machine_code: message } }
      : { ok: false, message };
  }
  if (!data?.length) return { ok: false, message: "ไม่พบเครื่องนี้ หรือคุณไม่มีสิทธิ์แก้ไข" };

  revalidatePath("/machines");
  revalidatePath(`/machines/${id}`);
  revalidatePath("/dashboard");
  return { ok: true, message: "บันทึกการแก้ไขแล้ว" };
}

export async function deleteMachine(id: string, prev: ActionState): Promise<ActionState> {
  void prev;
  await requireRole(["admin"]);
  const supabase = await createClient();
  const { data, error } = await supabase.from("machines").delete().eq("id", id).select("id");
  if (error) return { ok: false, message: dbErrorMessage(error) };
  if (!data?.length) return { ok: false, message: "ไม่พบเครื่องนี้ หรือคุณไม่มีสิทธิ์ลบ" };

  revalidatePath("/machines");
  revalidatePath("/dashboard");
  redirect("/machines?deleted=1");
}

export async function createMachine(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return withValues(await createMachineImpl(_prev, formData), formData);
}

export async function updateMachine(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  return withValues(await updateMachineImpl(id, _prev, formData), formData);
}
