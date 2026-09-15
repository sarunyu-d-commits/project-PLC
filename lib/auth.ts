import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AppRole, Profile } from "@/lib/types";

/**
 * Data Access Layer สำหรับตรวจสิทธิ์ฝั่ง server
 * proxy.ts เป็นแค่ด่านแรก (optimistic) — ทุกหน้า/ทุก action ต้องเรียกฟังก์ชันนี้อีกครั้ง
 * และ RLS ใน Supabase เป็นด่านสุดท้ายที่บังคับจริง
 */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", user.id)
    .single();

  return (data as Profile | null) ?? null;
});

export async function requireProfile(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  return profile;
}

export async function requireRole(roles: AppRole[]): Promise<Profile> {
  const profile = await requireProfile();
  if (!roles.includes(profile.role)) redirect("/dashboard?denied=1");
  return profile;
}

export const isStaff = (p: Profile) => p.role === "admin" || p.role === "technician";
export const isAdmin = (p: Profile) => p.role === "admin";
