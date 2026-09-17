import Link from "next/link";
import { notFound } from "next/navigation";
import { AlarmUpdateForm } from "./alarm-update-form";
import { PageHeader, Panel } from "@/components/page-header";
import { AlarmStatusMark, SeverityMark } from "@/components/status";
import { isStaff, requireProfile } from "@/lib/auth";
import { allowedNextStatuses } from "@/lib/domain/alarm";
import { formatDateTime } from "@/lib/labels";
import { pickUuid } from "@/lib/query";
import { createClient } from "@/lib/supabase/server";
import type { Alarm } from "@/lib/types";

export default async function AlarmDetailPage(props: PageProps<"/alarms/[id]">) {
  const profile = await requireProfile();
  const { id: rawId } = await props.params;
  const id = pickUuid(rawId);
  if (!id) notFound();

  const supabase = await createClient();
  const { data } = await supabase
    .from("alarms")
    .select("*, machine:machines(machine_code, name), closer:profiles!alarms_closed_by_fkey(full_name), creator:profiles!alarms_created_by_fkey(full_name)")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const alarm = data as Alarm & { creator: { full_name: string } | null };

  const rows: [string, React.ReactNode][] = [
    ["เครื่องจักร", <Link key="m" href={`/machines/${alarm.machine_id}`} className="underline underline-offset-2">{alarm.machine?.machine_code} {alarm.machine?.name}</Link>],
    ["เกิดเมื่อ", formatDateTime(alarm.occurred_at)],
    ["ระดับ", <SeverityMark key="s" severity={alarm.severity} />],
    ["สถานะ", <AlarmStatusMark key="st" status={alarm.status} />],
    ["ที่มา", alarm.source === "plc" ? "PLC Gateway" : `บันทึกโดย ${alarm.creator?.full_name ?? "–"}`],
    ["สาเหตุ", alarm.cause ?? "–"],
    ["การแก้ไข", alarm.action_taken ?? "–"],
    ["ปิดเมื่อ", alarm.closed_at ? `${formatDateTime(alarm.closed_at)} โดย ${alarm.closer?.full_name ?? "ระบบ"}` : "–"],
  ];

  return (
    <>
      <p className="mb-2 text-sm"><Link href="/alarms" className="underline underline-offset-2">Alarm ทั้งหมด</Link></p>
      <PageHeader
        title={`Alarm ${alarm.alarm_code}`}
        description={alarm.description}
        actions={
          isStaff(profile) ? (
            <Link className="btn btn-quiet" href={`/maintenance?machine=${alarm.machine_id}&alarm=${alarm.id}#new`}>
              เปิดงานซ่อมจาก Alarm นี้
            </Link>
          ) : undefined
        }
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="รายละเอียด">
          <dl className="grid grid-cols-[7rem_1fr] gap-x-4 gap-y-2">
            {rows.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-steel">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </Panel>
        {isStaff(profile) && alarm.status === "closed" && profile.role !== "admin" ? (
          <Panel title="อัปเดตสถานะ">
            <p className="text-steel">Alarm นี้ปิดแล้วและแก้ไขไม่ได้ หากต้องเปิดใหม่หรือแก้ข้อมูล ให้ติดต่อ Admin</p>
          </Panel>
        ) : isStaff(profile) ? (
          <Panel title="อัปเดตสถานะ">
            <AlarmUpdateForm alarm={alarm} allowed={allowedNextStatuses(alarm.status, profile.role)} />
            {alarm.status === "closed" && (
              <p className="mt-3 text-sm text-steel">Alarm ที่ปิดแล้วแก้ข้อมูลไม่ได้ ต้องเปลี่ยนสถานะเป็น Open ก่อน</p>
            )}
          </Panel>
        ) : (
          <Panel><p className="text-steel">บัญชี Viewer ดูข้อมูลได้อย่างเดียว</p></Panel>
        )}
      </div>
    </>
  );
}
