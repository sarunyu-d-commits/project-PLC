import Link from "next/link";
import { AlarmStatusMark, MachineStatusMark, SeverityMark } from "@/components/status";
import { PageHeader, Panel, EmptyState } from "@/components/page-header";
import { requireProfile } from "@/lib/auth";
import { bangkokDayKey, lastSevenDays } from "@/lib/dates";
import { fetchAll } from "@/lib/fetch-all";
import { isStale } from "@/lib/domain/plc";
import { formatDateTime, MACHINE_STATUS_LABEL } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";
import type { Alarm, Machine, MachineStatus } from "@/lib/types";

const STATUS_ORDER: MachineStatus[] = ["running", "stop", "alarm", "maintenance"];

export default async function DashboardPage(props: PageProps<"/dashboard">) {
  await requireProfile();
  const { denied } = await props.searchParams;
  const supabase = await createClient();

  const week = lastSevenDays();

  const [machinesRes, activeAlarmsRes, weekAlarmsRes, alarmTotalRes, alarmActiveRes, alarmOpenRes, maintActiveRes, maintWaitingRes, maintTotalRes] =
    await Promise.all([
      supabase
        .from("machines")
        .select("id, machine_code, name, location, status, plc_linked, last_seen_at")
        .order("location")
        .order("machine_code"),
      supabase
        .from("alarms")
        .select("id, alarm_code, description, severity, status, occurred_at, machine:machines(machine_code, name)")
        .neq("status", "closed")
        .order("occurred_at", { ascending: false })
        .limit(8),
      fetchAll<{ occurred_at: string; machine_id: string }>((from, to) =>
        supabase.from("alarms").select("occurred_at, machine_id").gte("occurred_at", week.since).order("id").range(from, to),
      ),
      supabase.from("alarms").select("id", { count: "exact", head: true }),
      supabase.from("alarms").select("id", { count: "exact", head: true }).neq("status", "closed"),
      supabase.from("alarms").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("maintenance_records").select("id", { count: "exact", head: true }).neq("status", "done"),
      supabase.from("maintenance_records").select("id", { count: "exact", head: true }).eq("status", "waiting_part"),
      supabase.from("maintenance_records").select("id", { count: "exact", head: true }),
    ]);

  const machines = (machinesRes.data ?? []) as Machine[];
  const activeAlarms = (activeAlarmsRes.data ?? []) as unknown as Alarm[];
  const weekAlarms = weekAlarmsRes.rows;

  const counts = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0])) as Record<MachineStatus, number>;
  machines.forEach((m) => counts[m.status]++);

  const byLocation = new Map<string, Machine[]>();
  machines.forEach((m) => byLocation.set(m.location, [...(byLocation.get(m.location) ?? []), m]));

  // Alarm ต่อวัน ย้อนหลัง 7 วัน
  const days = week.days.map((d) => ({ ...d, count: 0 }));
  weekAlarms.forEach((a) => {
    const day = days.find((d) => d.key === bangkokDayKey(new Date(a.occurred_at)));
    if (day) day.count++;
  });
  const maxDay = Math.max(1, ...days.map((d) => d.count));

  // เครื่องที่เกิด Alarm บ่อยสุดในสัปดาห์
  const perMachine = new Map<string, number>();
  weekAlarms.forEach((a) => perMachine.set(a.machine_id, (perMachine.get(a.machine_id) ?? 0) + 1));
  const topMachines = [...perMachine.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, n]) => ({ machine: machines.find((m) => m.id === id), n }));

  const activeCount = alarmActiveRes.count ?? 0;
  const openCount = alarmOpenRes.count ?? 0;

  return (
    <>
      <PageHeader title="ภาพรวมโรงงาน" description="สถานะเครื่องจักรปัจจุบัน Alarm ที่ยังไม่ปิด และงานซ่อมที่ค้างอยู่" />

      {denied && (
        <p role="alert" className="mb-4 rounded-control border border-alarm/40 border-l-4 border-l-alarm bg-alarm-wash px-3 py-2 text-sm">
          บัญชีของคุณไม่มีสิทธิ์เข้าหน้านั้น
        </p>
      )}

      {/* แถบสรุปตัวเลข */}
      <dl className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
        <Stat label="เครื่องทั้งหมด" value={machines.length} />
        {STATUS_ORDER.map((s) => (
          <Stat
            key={s}
            label={MACHINE_STATUS_LABEL[s]}
            value={counts[s]}
            tone={s === "alarm" && counts[s] > 0 ? "alarm" : s === "maintenance" && counts[s] > 0 ? "maint" : undefined}
            href={`/machines?status=${s}`}
          />
        ))}
        <Stat label="Alarm ทั้งหมด" value={alarmTotalRes.count ?? 0} href="/alarms" />
        <Stat label="งานซ่อมค้าง" value={maintActiveRes.count ?? 0} href="/maintenance?status=active" />
        <Stat
          label="งานซ่อมทั้งหมด"
          value={maintTotalRes.count ?? 0}
          href="/maintenance"
          note={maintWaitingRes.count ? `รออะไหล่ ${maintWaitingRes.count}` : undefined}
        />
      </dl>

      {/* ผังพื้นที่โรงงาน */}
      <section aria-labelledby="floor-title" className="mb-6">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4">
          <h2 id="floor-title" className="text-lg font-semibold">ผังเครื่องจักรตามพื้นที่</h2>
          <p className="text-sm text-steel">สีจะปรากฏเฉพาะเครื่องที่ต้องการความสนใจ</p>
        </div>
        {machines.length === 0 ? (
          <Panel>
            <EmptyState>ยังไม่มีเครื่องจักร — <Link className="underline" href="/machines">เพิ่มเครื่องแรก</Link></EmptyState>
          </Panel>
        ) : (
          <div className="flex flex-col gap-3">
            {[...byLocation.entries()].map(([loc, list]) => (
              <div
                key={loc}
                className="grid overflow-hidden rounded-card border border-line bg-surface shadow-card sm:grid-cols-[8.5rem_1fr]"
              >
                <div className="flex items-center border-line bg-well px-3 py-2 font-semibold max-sm:border-b sm:border-r">
                  {loc}
                </div>
                <ul className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] content-start gap-2 p-2">
                  {list.map((m) => {
                    const stale = m.plc_linked && isStale(m.last_seen_at);
                    const tone =
                      m.status === "alarm"
                        ? "border-alarm bg-alarm-wash outline-1 -outline-offset-2 outline-alarm"
                        : m.status === "maintenance"
                          ? "border-line bg-maint-wash"
                          : "border-line bg-well/70";
                    return (
                      <li key={m.id} className={`rounded-control border ${tone}`}>
                        <Link href={`/machines/${m.id}`} className="block h-full px-3 py-2.5 hover:underline">
                          <span className="tabular block font-semibold">{m.machine_code}</span>
                          <span className="block truncate text-sm text-steel">{m.name}</span>
                          <span className="mt-1.5 block text-sm">
                            <MachineStatusMark status={m.status} />
                          </span>
                          {m.plc_linked && (
                            <span className={`mt-0.5 block text-xs ${stale ? "font-semibold text-maint" : "text-steel"}`}>
                              {stale ? "PLC ขาดการติดต่อ ข้อมูลอาจไม่เป็นปัจจุบัน" : "สถานะจาก PLC"}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[3fr_2fr]">
        <Panel title={`Alarm ที่ยังไม่ปิด ${activeCount} รายการ${openCount ? ` (ยังไม่มีคนรับ ${openCount})` : ""}`}>
          {activeAlarms.length === 0 ? (
            <EmptyState>ไม่มี Alarm ค้าง</EmptyState>
          ) : (
            <div className="relative overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>เวลา</th>
                    <th>เครื่อง</th>
                    <th>Alarm</th>
                    <th>ระดับ</th>
                    <th>สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {activeAlarms.map((a) => (
                    <tr key={a.id} data-abnormal={a.status === "open"}>
                      <td className="tabular whitespace-nowrap text-sm">{formatDateTime(a.occurred_at)}</td>
                      <td className="tabular whitespace-nowrap">{a.machine?.machine_code}</td>
                      <td>
                        <Link href={`/alarms/${a.id}`} className="font-medium underline-offset-2 hover:underline">
                          {a.alarm_code}
                        </Link>
                        <span className="block text-sm text-steel">{a.description}</span>
                      </td>
                      <td><SeverityMark severity={a.severity} /></td>
                      <td><AlarmStatusMark status={a.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {activeCount > activeAlarms.length && (
                <p className="mt-3 text-sm text-steel">
                  แสดง {activeAlarms.length} รายการล่าสุด{" "}
                  <Link href="/alarms?status=active" className="underline underline-offset-2">ดูทั้งหมด</Link>
                </p>
              )}
            </div>
          )}
        </Panel>

        <div className="flex min-w-0 flex-col gap-6">
          <Panel title="จำนวน Alarm 7 วันล่าสุด">
            <ol className="flex h-40 items-end gap-2" aria-label="กราฟจำนวน Alarm รายวัน">
              {days.map((d) => (
                <li key={d.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                  <span className={`tabular text-sm font-semibold ${d.count ? "" : "text-steel"}`}>{d.count}</span>
                  <span
                    className={`w-full rounded-t-[3px] ${d.count ? "bg-steel" : "bg-line"}`}
                    style={{ height: `${Math.max(2, (d.count / maxDay) * 100)}%` }}
                    aria-hidden="true"
                  />
                  <span className="w-full border-t border-line pt-1 text-center text-xs whitespace-nowrap text-steel">
                    {d.label}
                  </span>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel title="เครื่องที่เกิด Alarm บ่อยในสัปดาห์นี้">
            {topMachines.length === 0 ? (
              <EmptyState>ไม่มี Alarm ในสัปดาห์นี้</EmptyState>
            ) : (
              <ol className="flex flex-col gap-2">
                {topMachines.map(({ machine, n }) => (
                  <li key={machine?.id ?? n} className="grid grid-cols-[6rem_1fr_2rem] items-center gap-3">
                    <span className="tabular font-medium">{machine?.machine_code ?? "–"}</span>
                    <span className="h-2.5 rounded-full bg-well">
                      <span
                        className="block h-full rounded-full bg-steel"
                        style={{ width: `${(n / topMachines[0].n) * 100}%` }}
                      />
                    </span>
                    <span className="tabular text-right">{n}</span>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, tone, href, note }: {
  label: string;
  value: number;
  tone?: "alarm" | "maint";
  href?: string;
  note?: string;
}) {
  const color = tone === "alarm" ? "text-alarm" : tone === "maint" ? "text-maint" : "";
  const accent =
    tone === "alarm" ? "border-l-4 border-l-alarm" : tone === "maint" ? "border-l-4 border-l-maint" : "";
  const body = (
    <>
      <dt className="truncate text-sm text-steel">{label}</dt>
      <dd className={`tabular mt-0.5 text-3xl leading-none font-semibold ${color}`}>{value}</dd>
      {note && <dd className="mt-1 text-xs font-medium text-maint">{note}</dd>}
    </>
  );
  return (
    <div className={`rounded-card border border-line bg-surface shadow-card ${accent}`}>
      {href ? (
        <Link
          href={href}
          className="block rounded-card px-4 py-3 transition-colors hover:bg-well focus-visible:outline-offset-0"
        >
          {body}
        </Link>
      ) : (
        <div className="px-4 py-3">{body}</div>
      )}
    </div>
  );
}
