import { MachinePanel } from "./machine-panel";
import { EmptyState, PageHeader, Panel } from "@/components/page-header";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Machine } from "@/lib/types";

type OpenAlarm = { id: string; machine_id: string; alarm_code: string };

export default async function SimulatorPage() {
  await requireRole(["admin"]);
  const supabase = await createClient();

  const [{ data: machinesData }, { data: alarmsData }] = await Promise.all([
    supabase
      .from("machines")
      .select("id, machine_code, name, location, status, plc_linked")
      .order("location")
      .order("machine_code"),
    supabase
      .from("alarms")
      .select("id, machine_id, alarm_code")
      .neq("status", "closed")
      .order("occurred_at", { ascending: false }),
  ]);

  const machines = (machinesData ?? []) as Pick<Machine, "id" | "machine_code" | "name" | "location" | "status" | "plc_linked">[];
  const alarms = (alarmsData ?? []) as OpenAlarm[];

  const byLocation = new Map<string, typeof machines>();
  machines.forEach((m) => byLocation.set(m.location, [...(byLocation.get(m.location) ?? []), m]));

  return (
    <>
      <PageHeader
        title="จำลองเครื่องจักร"
        description="ใช้แทน PLC สำหรับทดสอบและสาธิตระบบ ทุกคำสั่งมีผลกับข้อมูลจริง Alarm ที่สร้างจากหน้านี้จะมีป้าย “จำลอง” กำกับ"
      />

      <ol className="mb-6 grid gap-x-8 gap-y-2 rounded-card border border-line bg-well px-4 py-3 text-sm shadow-card sm:grid-cols-2 lg:grid-cols-4">
        <li><span className="font-semibold">จำลอง Fault</span> สร้าง Alarm และเครื่องเปลี่ยนเป็น Alarm ทันที</li>
        <li><span className="font-semibold">เข้าซ่อม</span> ทำได้แม้มี Alarm ค้าง</li>
        <li><span className="font-semibold">ปิด Alarm</span> ที่หน้า Alarm เมื่อปิดครบ เครื่องจะเป็น Stop</li>
        <li><span className="font-semibold">เดินเครื่อง</span> ได้เมื่อไม่มี Alarm ค้างเท่านั้น</li>
      </ol>

      {machines.length === 0 ? (
        <Panel>
          <EmptyState>ยังไม่มีเครื่องจักร</EmptyState>
        </Panel>
      ) : (
        <div className="flex flex-col gap-6">
          {[...byLocation.entries()].map(([loc, list]) => (
            <section key={loc} aria-labelledby={`loc-${loc}`}>
              <h2 id={`loc-${loc}`} className="mb-2 text-lg font-semibold">{loc}</h2>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(17rem,1fr))] gap-3">
                {list.map((m) => (
                  <MachinePanel
                    key={m.id}
                    machine={m}
                    openAlarms={alarms.filter((a) => a.machine_id === m.id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
