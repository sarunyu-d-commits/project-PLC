"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbErrorMessage, formDataToObject, roleSchema, toFieldErrors } from "@/lib/validation";
import type { ActionState } from "@/lib/types";

export async function changeRole(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(["admin"]);
  const parsed = roleSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return toFieldErrors(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ role: parsed.data.role })
    .eq("id", parsed.data.user_id)
    .select("full_name");
  if (error) return { ok: false, message: dbErrorMessage(error) };
  if (!data?.length) return { ok: false, message: "ไม่พบผู้ใช้นี้" };

  revalidatePath("/users");
  return { ok: true, message: `เปลี่ยนสิทธิ์ของ ${data[0].full_name} แล้ว` };
}
