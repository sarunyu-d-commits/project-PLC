"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formDataToObject, loginSchema, toFieldErrors } from "@/lib/validation";
import { withValues } from "@/lib/validation";
import type { ActionState } from "@/lib/types";

function safeNext(next: string | undefined): string {
  // กัน open redirect: รับเฉพาะ path ภายในเว็บ
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

async function loginImpl(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const raw = formDataToObject(formData);
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) return toFieldErrors(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { ok: false, message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
  }
  redirect(safeNext(raw.next));
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return withValues(await loginImpl(_prev, formData), formData);
}
