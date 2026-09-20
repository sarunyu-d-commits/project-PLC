import Link from "next/link";
import { AlarmCreateForm } from "./alarm-create-form";
import { FilterBar, FilterField } from "@/components/filter-bar";
import { EmptyState, PageHeader, Panel } from "@/components/page-header";
import { AlarmStatusMark, SeverityMark } from "@/components/status";
import { isStaff, requireProfile } from "@/lib/auth";
import { ALARM_STATUSES, buildAlarmQuery, parseAlarmFilters, SEVERITIES } from "@/lib/alarm-query";
import { ALARM_STATUS_LABEL, formatDateTime, SEVERITY_LABEL } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";
import type { Alarm } from "@/lib/types";

export default async function AlarmsPage(props: PageProps<"/alarms">) {
  const profile = await requireProfile();
  const sp = await props.searchParams;
  const f = parseAlarmFilters(sp);

  const supabase = await createClient();
  const [{ data, error }, { data: machines }] = await Promise.all([
    buildAlarmQuery(supabase, f).limit(200),
    supabase.from("machines").select("id, machine_code, name").order("machine_code"),
  ]);
  const alarms = (data ?? []) as unknown as Alarm[];
  const activeCount = Object.values(f).filter(Boolean).length;
  const exportQuery = new URLSearchParams(
    Object.entries(f).filter(([, v]) => v) as [string, string][],
  ).toString();

  return (
    <>
      <PageHeader
        title="Alarm"
        description="บันทึก ติดตาม และปิด Alarm ของเครื่องจักร"
        actions={
          <a className="btn btn-quiet" href={`/api/export/alarms${exportQuery ? `?${exportQuery}` : ""}`} download>
            ดาวน์โหลด CSV
          </a>
        }
      />

      <FilterBar action="/alarms" activeCount={activeCount}>
        <FilterField label="ค้นหา Code หรือรายละเอียด">
          <input className="input" name="q" defaultValue={f.q} />
        </FilterField>
        <FilterField label="เครื่องจักร">
          <select className="input" name="machine" defaultValue={f.machine}>
            <option value="">ทั้งหมด</option>
            {(machines ?? []).map((m) => <option key={m.id} value={m.id}>{m.machine_code}</option>)}
          </select>
        </FilterField>
        <FilterField label="สถานะ">
          <select className="input" name="status" defaultValue={f.status}>
            <option value="">ทั้งหมด</option>
            <option value="active">ยังไม่ปิด</option>
            {ALARM_STATUSES.map((s) => <option key={s} value={s}>{ALARM_STATUS_LABEL[s]}</option>)}
          </select>
        </FilterField>
        <FilterField label="ความรุนแรง">
          <select className="input" name="severity" defaultValue={f.severity}>
            <option value="">ทั้งหมด</option>
            {SEVERITIES.map((s) => <option key={s} value={s}>{SEVERITY_LABEL[s]}</option>)}
          </select>
        </FilterField>
        <FilterField label="ตั้งแต่วันที่">
          <input className="input tabular" type="date" name="from" defaultValue={f.from} />
        </FilterField>
        <FilterField label="ถึงวันที่">
          <input className="input tabular" type="date" name="to" defaultValue={f.to} />
        </FilterField>
      </FilterBar>

      <Panel className="mb-6">
        {error ? (
          <p role="alert" className="text-alarm">โหลดข้อมูลไม่สำเร็จ กรุณารีเฟรชหน้า</p>
        ) : alarms.length === 0 ? (
          <EmptyState>{activeCount ? "ไม่พบ Alarm ที่ตรงกับตัวกรอง" : "ยังไม่มี Alarm"}</EmptyState>
        ) : (
          <div className="relative overflow-x-auto">
            <table className="data-table">
              <caption className="sr-only">รายการ Alarm</caption>
              <thead>
                <tr>
                  <th>วันเวลา</th>
                  <th>เครื่อง</th>
                  <th>Alarm</th>
                  <th>สาเหตุ</th>
                  <th>ระดับ</th>
                  <th>สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {alarms.map((a) => (
                  <tr key={a.id} data-abnormal={a.status === "open"}>
                    <td className="tabular text-sm whitespace-nowrap">{formatDateTime(a.occurred_at)}</td>
                    <td className="tabular whitespace-nowrap">
                      <Link href={`/machines/${a.machine_id}`} className="underline-offset-2 hover:underline">{a.machine?.machine_code}</Link>
                    </td>
                    <td>
                      <Link href={`/alarms/${a.id}`} className="font-semibold underline underline-offset-2">{a.alarm_code}</Link>
                      {a.source === "plc" && <span className="ml-2 text-xs text-steel">PLC</span>}
                      {a.source === "sim" && <span className="ml-2 text-xs text-steel">จำลอง</span>}
                      <span className="block text-sm">{a.description}</span>
                    </td>
                    <td className="text-sm">{a.cause ?? <span className="text-steel">–</span>}</td>
                    <td><SeverityMark severity={a.severity} /></td>
                    <td>
                      <AlarmStatusMark status={a.status} />
                      {a.status === "closed" && a.closer && (
                        <span className="block text-xs text-steel">โดย {a.closer.full_name}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-sm text-steel">
              แสดง {alarms.length} รายการ{alarms.length === 200 ? " (สูงสุด 200 รายการ ใช้ตัวกรองเพื่อจำกัดผล)" : ""}
            </p>
          </div>
        )}
      </Panel>

      {isStaff(profile) && (
        <Panel title="บันทึก Alarm ใหม่">
          <AlarmCreateForm machines={machines ?? []} defaultMachine={f.machine || undefined} />
        </Panel>
      )}
    </>
  );
}
