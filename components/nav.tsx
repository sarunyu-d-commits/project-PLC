"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AppRole } from "@/lib/types";

const LINKS: { href: string; label: string; roles?: AppRole[] }[] = [
  { href: "/dashboard", label: "ภาพรวม" },
  { href: "/machines", label: "เครื่องจักร" },
  { href: "/alarms", label: "Alarm" },
  { href: "/maintenance", label: "งานซ่อมบำรุง" },
  { href: "/simulator", label: "จำลองเครื่องจักร", roles: ["admin"] },
  { href: "/users", label: "ผู้ใช้งาน", roles: ["admin"] },
  { href: "/audit", label: "ประวัติการแก้ไข", roles: ["admin"] },
];

export function Nav({ role, openAlarms }: { role: AppRole; openAlarms: number }) {
  const pathname = usePathname();
  return (
    <nav aria-label="เมนูหลัก">
      <ul className="relative flex gap-1 overflow-x-auto md:flex-col">
        {LINKS.filter((l) => !l.roles || l.roles.includes(role)).map((l) => {
          const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center justify-between gap-3 whitespace-nowrap border-l-4 px-3 py-2 ${
                  active ? "border-ink bg-surface font-semibold" : "border-transparent text-steel hover:bg-well hover:text-ink"
                }`}
              >
                {l.label}
                {l.href === "/alarms" && openAlarms > 0 && (
                  <span className="tabular bg-alarm px-1.5 text-xs font-semibold text-white" aria-label={`${openAlarms} รายการที่ยังไม่รับ`}>
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
