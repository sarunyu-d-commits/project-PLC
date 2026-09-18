import { redirect } from "next/navigation";
import { logout } from "@/app/login/actions";
import { getCurrentProfile, getSessionUserId } from "@/lib/auth";

export default async function NoAccessPage() {
  if (!(await getSessionUserId())) redirect("/login");
  if (await getCurrentProfile()) redirect("/dashboard");

  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <div className="max-w-md border border-line bg-surface p-6">
        <h1 className="text-xl font-semibold">บัญชียังไม่ได้ตั้งค่าสิทธิ์</h1>
        <p className="mt-2 text-steel">
          ระบบไม่พบข้อมูลสิทธิ์ของบัญชีนี้ ให้ Admin รันไฟล์ supabase/migrations/004_backfill_profiles.sql
          ใน Supabase SQL Editor แล้วกำหนดสิทธิ์ให้ที่หน้าผู้ใช้งาน
        </p>
        <form action={logout} className="mt-5">
          <button type="submit" className="btn btn-quiet">ออกจากระบบ</button>
        </form>
      </div>
    </main>
  );
}
