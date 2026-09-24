import { Nav } from "@/components/nav";
import { requireProfile } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/login/actions";

/** ตัวย่อชื่อผู้ใช้ ใช้แทนรูปโปรไฟล์ */
function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  // ดึงข้อมูลผู้ใช้และจำนวน Alarm พร้อมกัน แทนการรอทีละขั้น
  const [profile, { count }] = await Promise.all([
    requireProfile(),
    supabase.from("alarms").select("id", { count: "exact", head: true }).eq("status", "open"),
  ]);
  const name = profile.full_name || "ผู้ใช้";

  return (
    <div className="md:grid md:min-h-dvh md:grid-cols-[15rem_1fr]">
      {/* แถบควบคุม: โทนเข้มเพื่อแยกจากพื้นที่ข้อมูล และตรึงไว้ข้างจอเมื่อเลื่อนหน้า */}
      <div className="bg-shell text-shell-ink">
        <aside className="md:sticky md:top-0 md:flex md:h-dvh md:flex-col md:overflow-y-auto">
          <div className="flex items-center justify-between gap-3 px-4 py-3 md:block md:py-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-control bg-shell-hi" aria-hidden="true">
                <svg viewBox="0 0 12 12" className="size-4 text-alarm">
                  <path d="M6 0.8 11.4 11H0.6Z" fill="currentColor" />
                </svg>
              </span>
              <p className="text-[0.95rem] leading-snug font-semibold tracking-tight">Alarm &amp; Maintenance</p>
            </div>

            {/* ผู้ใช้ปัจจุบัน */}
            <div className="flex items-center gap-2.5 max-md:max-w-[45%] md:mt-4 md:w-full">
              <span
                className="tabular grid size-8 shrink-0 place-items-center rounded-full bg-shell-hi text-sm font-semibold text-shell-ink"
                aria-hidden="true"
              >
                {initials(name)}
              </span>
              <div className="min-w-0 text-sm leading-tight">
                <p className="truncate font-medium text-white">{name}</p>
                <p className="truncate text-shell-dim">{ROLE_LABEL[profile.role]}</p>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 px-2 py-2 md:grow md:py-3">
            <Nav role={profile.role} openAlarms={count ?? 0} />
          </div>

          <form action={logout} className="hidden px-3 pb-4 md:block">
            <button
              type="submit"
              className="btn w-full border-white/20 bg-transparent text-shell-ink shadow-none hover:bg-shell-hi"
            >
              ออกจากระบบ
            </button>
          </form>
        </aside>
      </div>

      <main className="min-w-0 px-4 py-6 md:px-8 md:py-7">
        <div className="mx-auto max-w-[96rem]">
          {children}
          <form action={logout} className="mt-10 md:hidden">
            <button type="submit" className="btn btn-quiet w-full">
              ออกจากระบบ
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
