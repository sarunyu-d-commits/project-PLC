"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  dbErrorMessage,
  formDataToObject,
  maintenanceSchema,
  toFieldErrors,
} from "@/lib/validation";
import { withValues } from "@/lib/validation";
import type { ActionState } from "@/lib/types";

function revalidate(id?: string) {
  revalidatePath("/maintenance");
  revalidatePath("/dashboard");
  if (id) revalidatePath(`/maintenance/${id}`);
}

async function createMaintenanceImpl(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const profile = await requireRole(["admin", "technician"]);
  const parsed = maintenanceSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return toFieldErrors(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.from("maintenance_records").insert({
    ...parsed.data,
    technician_id: parsed.data.technician_id ?? (profile.role === "technician" ? profile.id : null),
    created_by: profile.id,
  });
  if (error) return { ok: false, message: dbErrorMessage(error) };

  revalidate();
  return { ok: true, message: "บันทึกงานซ่อมแล้ว" };
}

async function updateMaintenanceImpl(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(["admin", "technician"]);
  const parsed = maintenanceSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return toFieldErrors(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("maintenance_records")
    .update(parsed.data)
    .eq("id", id)
    .select("id");
  if (error) return { ok: false, message: dbErrorMessage(error) };
  if (!data?.length) return { ok: false, message: "ไม่พบงานนี้ หรือคุณไม่มีสิทธิ์แก้ไข" };

  revalidate(id);
  return { ok: true, message: "บันทึกการแก้ไขแล้ว" };
}

export async function createMaintenance(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return withValues(await createMaintenanceImpl(_prev, formData), formData);
}

export async function updateMaintenance(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  return withValues(await updateMaintenanceImpl(id, _prev, formData), formData);
}
