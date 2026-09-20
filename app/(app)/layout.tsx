import { Nav } from "@/components/nav";
import { requireProfile } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/login/actions";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  // ดึงข้อมูลผู้ใช้และจำนวน Alarm พร้อมกัน แทนการรอทีละขั้น
  const [profile, { count }] = await Promise.all([
    requireProfile(),
    supabase.from("alarms").select("id", { count: "exact", head: true }).eq("status", "open"),
  ]);

  return (
    <div className="md:grid md:min-h-dvh md:grid-cols-[14rem_1fr]">
      <aside className="border-b border-line bg-well md:border-r md:border-b-0">
        <div className="flex items-center justify-between gap-2 px-4 py-4 md:block">
          <p className="font-semibold leading-tight">Alarm &amp; Maintenance</p>
          <div className="text-sm text-steel md:mt-3">
            <p className="font-medium text-ink">{profile.full_name || "ผู้ใช้"}</p>
            <p>{ROLE_LABEL[profile.role]}</p>
          </div>
        </div>
        <div className="px-2 pb-2 md:pb-4">
          <Nav role={profile.role} openAlarms={count ?? 0} />
        </div>
        <form action={logout} className="hidden px-4 pb-6 md:block">
          <button type="submit" className="btn btn-quiet w-full">
            ออกจากระบบ
          </button>
        </form>
      </aside>
      <main className="min-w-0 px-4 py-6 md:px-8">
        {children}
        <form action={logout} className="mt-10 md:hidden">
          <button type="submit" className="btn btn-quiet w-full">
            ออกจากระบบ
          </button>
        </form>
      </main>
    </div>
  );
}
