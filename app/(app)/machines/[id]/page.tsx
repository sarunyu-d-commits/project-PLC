import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteMachineButton } from "./delete-button";
import { updateMachine } from "../actions";
import { MachineForm } from "../machine-form";
import { EmptyState, PageHeader, Panel } from "@/components/page-header";
import { AlarmStatusMark, MachineStatusMark, MaintStatusMark, SeverityMark } from "@/components/status";
import { isAdmin, requireProfile } from "@/lib/auth";
import { isStale } from "@/lib/domain/plc";
import { formatDateTime, MAINT_TYPE_LABEL } from "@/lib/labels";
import { pickUuid } from "@/lib/query";
import { createClient } from "@/lib/supabase/server";
import type { Alarm, Machine, MaintenanceRecord } from "@/lib/types";

export default async function MachineDetailPage(props: PageProps<"/machines/[id]">) {
  const profile = await requireProfile();
  const { id: rawId } = await props.params;
  const id = pickUuid(rawId);
  if (!id) notFound();

  const supabase = await createClient();
  const [machineRes, alarmsRes, maintRes] = await Promise.all([
    supabase.from("machines").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("alarms")
      .select("id, alarm_code, description, severity, status, occurred_at, closed_at, source")
      .eq("machine_id", id)
      .order("occurred_at", { ascending: false })
      .limit(50),
    supabase
      .from("maintenance_records")
      .select("id, maintenance_type, problem, action_taken, status, started_at, completed_at, technician:profiles!maintenance_records_technician_id_fkey(full_name)")
      .eq("machine_id", id)
      .order("started_at", { ascending: false })
      .limit(50),
  ]);

  const machine = machineRes.data as Machine | null;
  if (!machine) notFound();
  const alarms = (alarmsRes.data ?? []) as Alarm[];
  const maint = (maintRes.data ?? []) as unknown as MaintenanceRecord[];

  // รวมเป็นไทม์ไลน์เดียว (Machine History)
  const timeline = [
    ...alarms.map((a) => ({ kind: "alarm" as const, at: a.occurred_at, alarm: a })),
    ...maint.map((m) => ({ kind: "maint" as const, at: m.started_at, maint: m })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <>
      <p className="mb-2 text-sm"><Link href="/machines" className="underline underline-offset-2">เครื่องจักรทั้งหมด</Link></p>
      <PageHeader
        title={`${machine.machine_code} ${machine.name}`}
        description={`${machine.machine_type} ที่ ${machine.location}`}
        actions={
          <>
            <Link className="btn btn-quiet" href={`/alarms?machine=${machine.id}`}>Alarm ของเครื่องนี้</Link>
            <Link className="btn btn-quiet" href={`/maintenance?machine=${machine.id}`}>งานซ่อมของเครื่องนี้</Link>
          </>
        }
      />

      <dl className="mb-6 flex flex-wrap gap-x-10 gap-y-3 border border-line bg-surface px-4 py-3">
        <div><dt className="text-sm text-steel">สถานะ</dt><dd className="text-lg"><MachineStatusMark status={machine.status} /></dd></div>
        <div><dt className="text-sm text-steel">Alarm ทั้งหมด</dt><dd className="tabular text-lg font-semibold">{alarms.length}</dd></div>
        <div><dt className="text-sm text-steel">งานซ่อมทั้งหมด</dt><dd className="tabular text-lg font-semibold">{maint.length}</dd></div>
        <div>
          <dt className="text-sm text-steel">แหล่งสถานะ</dt>
          <dd className="text-lg">
            {machine.plc_linked ? (
              <>PLC Gateway {isStale(machine.last_seen_at) && <span className="text-sm font-semibold text-maint">(ขาดการติดต่อ อัปเดตล่าสุด {formatDateTime(machine.last_seen_at)})</span>}</>
            ) : "กรอกเอง"}
          </dd>
        </div>
      </dl>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[3fr_2fr]">
        <Panel title="ประวัติเครื่อง">
          {timeline.length === 0 ? (
            <EmptyState>ยังไม่มีประวัติ Alarm หรืองานซ่อม</EmptyState>
          ) : (
            <ol className="relative flex flex-col gap-4 border-l-2 border-line pl-5">
              {timeline.map((t) =>
                t.kind === "alarm" ? (
                  <li key={`a-${t.alarm.id}`}>
                    <p className="tabular text-sm text-steel">{formatDateTime(t.at)} {t.alarm.source === "plc" ? "Alarm จาก PLC" : "Alarm"}</p>
                    <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <Link href={`/alarms/${t.alarm.id}`} className="font-semibold underline-offset-2 hover:underline">{t.alarm.alarm_code}</Link>
                      <AlarmStatusMark status={t.alarm.status} />
                      <SeverityMark severity={t.alarm.severity} />
                    </p>
                    <p className="text-sm">{t.alarm.description}</p>
                  </li>
                ) : (
                  <li key={`m-${t.maint.id}`}>
                    <p className="tabular text-sm text-steel">{formatDateTime(t.at)} {MAINT_TYPE_LABEL[t.maint.maintenance_type]}{t.maint.technician ? ` โดย ${t.maint.technician.full_name}` : ""}</p>
                    <p className="flex flex-wrap items-center gap-x-4">
                      <Link href={`/maintenance/${t.maint.id}`} className="font-semibold underline-offset-2 hover:underline">{t.maint.problem}</Link>
                      <MaintStatusMark status={t.maint.status} />
                    </p>
                    {t.maint.action_taken && <p className="text-sm">แก้ไข: {t.maint.action_taken}</p>}
                  </li>
                ),
              )}
            </ol>
          )}
        </Panel>

        {isAdmin(profile) && (
          <div className="flex flex-col gap-6">
            <Panel title="แก้ไขข้อมูลเครื่อง">
              <MachineForm action={updateMachine.bind(null, machine.id)} machine={machine} submitLabel="บันทึกการแก้ไข" />
            </Panel>
            <Panel title="ลบเครื่องจักร">
              <DeleteMachineButton id={machine.id} code={machine.machine_code} />
            </Panel>
          </div>
        )}
      </div>
    </>
  );
}
