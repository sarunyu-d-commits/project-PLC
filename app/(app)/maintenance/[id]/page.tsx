import Link from "next/link";
import { notFound } from "next/navigation";
import { updateMaintenance } from "../actions";
import { MaintenanceForm } from "../maintenance-form";
import { PageHeader, Panel } from "@/components/page-header";
import { MaintStatusMark } from "@/components/status";
import { isStaff, requireProfile } from "@/lib/auth";
import { formatDateTime, MAINT_TYPE_LABEL } from "@/lib/labels";
import { loadMaintenanceOptions } from "@/lib/options";
import { pickUuid } from "@/lib/query";
import { createClient } from "@/lib/supabase/server";
import type { MaintenanceRecord } from "@/lib/types";

export default async function MaintenanceDetailPage(props: PageProps<"/maintenance/[id]">) {
  const profile = await requireProfile();
  const { id: rawId } = await props.params;
  const id = pickUuid(rawId);
  if (!id) notFound();

  const supabase = await createClient();
  const { data } = await supabase
    .from("maintenance_records")
    .select("*, machine:machines(machine_code, name), technician:profiles!maintenance_records_technician_id_fkey(full_name), alarm:alarms(id, alarm_code)")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const options = await loadMaintenanceOptions(supabase, {
    alarmId: data.alarm_id as string | null,
    technicianId: data.technician_id as string | null,
  });
  const record = data as MaintenanceRecord & { alarm: { id: string; alarm_code: string } | null };

  return (
    <>
      <p className="mb-2 text-sm"><Link href="/maintenance" className="underline underline-offset-2">งานซ่อมทั้งหมด</Link></p>
      <PageHeader
        title={record.problem}
        description={`${MAINT_TYPE_LABEL[record.maintenance_type]} ของ ${record.machine?.machine_code} ${record.machine?.name}`}
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_3fr]">
        <Panel title="สรุป">
          <dl className="grid grid-cols-[7rem_1fr] gap-x-4 gap-y-2">
            <dt className="text-steel">สถานะ</dt><dd><MaintStatusMark status={record.status} /></dd>
            <dt className="text-steel">ช่าง</dt><dd>{record.technician?.full_name ?? "ยังไม่มีคนรับ"}</dd>
            <dt className="text-steel">เริ่ม</dt><dd className="tabular">{formatDateTime(record.started_at)}</dd>
            <dt className="text-steel">เสร็จ</dt><dd className="tabular">{formatDateTime(record.completed_at)}</dd>
            <dt className="text-steel">Alarm</dt>
            <dd>{record.alarm ? <Link className="underline underline-offset-2" href={`/alarms/${record.alarm.id}`}>{record.alarm.alarm_code}</Link> : "–"}</dd>
          </dl>
        </Panel>
        {isStaff(profile) ? (
          <Panel title="แก้ไขงานซ่อม">
            <MaintenanceForm
              action={updateMaintenance.bind(null, record.id)}
              record={record}
              {...options}
              submitLabel="บันทึกการแก้ไข"
            />
          </Panel>
        ) : (
          <Panel><p className="text-steel">บัญชี Viewer ดูข้อมูลได้อย่างเดียว</p></Panel>
        )}
      </div>
    </>
  );
}
