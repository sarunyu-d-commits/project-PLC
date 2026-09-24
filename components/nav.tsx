"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AppRole } from "@/lib/types";

type IconName = "overview" | "machine" | "alarm" | "wrench" | "sliders" | "users" | "history";

/** ไอคอนเส้นเรียบ ๆ วาดในโค้ดเอง จึงไม่ต้องโหลดไลบรารีเพิ่ม */
function Icon({ name }: { name: IconName }) {
  const p: Record<IconName, React.ReactNode> = {
    overview: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
    machine: (
      <>
        <rect x="4" y="8" width="16" height="12" rx="1.5" />
        <path d="M8 8V5h8v3M9 20v-5h6v5M4 12h16" />
      </>
    ),
    alarm: (
      <>
        <path d="M12 4 21 20H3Z" />
        <path d="M12 10v4M12 17h.01" />
      </>
    ),
    wrench: <path d="M15.5 3.5a5 5 0 0 0-5.9 6.4L3 16.5 7.5 21l6.6-6.6a5 5 0 0 0 6.4-5.9l-3.1 3.1-2.9-.6-.6-2.9Z" />,
    sliders: (
      <>
        <path d="M5 21V14M5 10V3M12 21v-9M12 8V3M19 21v-5M19 12V3" />
        <path d="M2.5 14h5M9.5 12h5M16.5 16h5" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="3.4" />
        <path d="M2.8 20a6.2 6.2 0 0 1 12.4 0M16 5.2a3.4 3.4 0 0 1 0 5.6M17.4 14.4A6.2 6.2 0 0 1 21.2 20" />
      </>
    ),
    history: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7v5.2l3.4 2" />
      </>
    ),
  };
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-[18px] shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {p[name]}
    </svg>
  );
}

const LINKS: { href: string; label: string; icon: IconName; roles?: AppRole[] }[] = [
  { href: "/dashboard", label: "ภาพรวม", icon: "overview" },
  { href: "/machines", label: "เครื่องจักร", icon: "machine" },
  { href: "/alarms", label: "Alarm", icon: "alarm" },
  { href: "/maintenance", label: "งานซ่อมบำรุง", icon: "wrench" },
  { href: "/simulator", label: "จำลองเครื่องจักร", icon: "sliders", roles: ["admin"] },
  { href: "/users", label: "ผู้ใช้งาน", icon: "users", roles: ["admin"] },
  { href: "/audit", label: "ประวัติการแก้ไข", icon: "history", roles: ["admin"] },
];

export function Nav({ role, openAlarms }: { role: AppRole; openAlarms: number }) {
  const pathname = usePathname();
  return (
    <nav aria-label="เมนูหลัก">
      <ul className="relative flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
        {LINKS.filter((l) => !l.roles || l.roles.includes(role)).map((l) => {
          const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-2.5 rounded-control whitespace-nowrap px-3 py-2 transition-colors ${
                  active
                    ? "bg-shell-hi font-semibold text-white shadow-[inset_3px_0_0_var(--color-focus)]"
                    : "text-shell-dim hover:bg-shell-hi/60 hover:text-shell-ink"
                }`}
              >
                <Icon name={l.icon} />
                <span className="grow">{l.label}</span>
                {l.href === "/alarms" && openAlarms > 0 && (
                  <span
                    className="tabular ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-alarm px-1.5 py-px text-xs font-semibold text-white"
                    aria-label={`${openAlarms} รายการที่ยังไม่รับ`}
                  >
                    {openAlarms}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
