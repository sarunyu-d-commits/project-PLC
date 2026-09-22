import Link from "next/link";
import { createMaintenance } from "./actions";
import { MaintenanceForm } from "./maintenance-form";
import { FilterBar, FilterField } from "@/components/filter-bar";
import { PAGE_SIZE, Pagination } from "@/components/pagination";
import { EmptyState, PageHeader, Panel } from "@/components/page-header";
import { MaintStatusMark } from "@/components/status";
import { isStaff, requireProfile } from "@/lib/auth";
import { formatDateTime, MAINT_STATUS_LABEL, MAINT_TYPE_LABEL } from "@/lib/labels";
import { loadMaintenanceOptions } from "@/lib/options";
import { cleanSearch, pickDate, pickEnum, pickPage, pickUuid } from "@/lib/query";
import { createClient } from "@/lib/supabase/server";
import type { MaintenanceRecord, MaintenanceStatus, MaintenanceType } from "@/lib/types";

const STATUSES = Object.keys(MAINT_STATUS_LABEL) as MaintenanceStatus[];
const TYPES = Object.keys(MAINT_TYPE_LABEL) as MaintenanceType[];

export default async function MaintenancePage(props: PageProps<"/maintenance">) {
  const profile = await requireProfile();
  const sp = await props.searchParams;
  const rawStatus = typeof sp.status === "string" ? sp.status : "";
  const f = {
    q: cleanSearch(sp.q),
    machine: pickUuid(sp.machine),
    technician: typeof sp.technician === "string" && sp.technician === "none" ? "none" : pickUuid(sp.technician),
    status: rawStatus === "active" ? "active" : pickEnum(rawStatus, STATUSES),
    type: pickEnum(sp.type, TYPES),
    from: pickDate(sp.from),
    to: pickDate(sp.to),
  };
  const prefillAlarm = pickUuid(sp.alarm);
  const page = pickPage(sp.page);
  const fromRow = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();
  let query = supabase
    .from("maintenance_records")
    .select(
      "id, machine_id, alarm_id, technician_id, maintenance_type, problem, action_taken, status, started_at, completed_at, machine:machines(machine_code, name), technician:profiles!maintenance_records_technician_id_fkey(full_name)",
      { count: "exact" },
    )
    .order("started_at", { ascending: false })
    .order("id");
  if (f.q) query = query.or(`problem.ilike.%${f.q}%,action_taken.ilike.%${f.q}%`);
  if (f.machine) query = query.eq("machine_id", f.machine);
  if (f.technician === "none") query = query.is("technician_id", null);
  else if (f.technician) query = query.eq("technician_id", f.technician);
  if (f.status === "active") query = query.neq("status", "done");
  else if (f.status) query = query.eq("status", f.status);
  if (f.type) query = query.eq("maintenance_type", f.type);
  if (f.from) query = query.gte("started_at", `${f.from}T00:00:00+07:00`);
  if (f.to) query = query.lte("started_at", `${f.to}T23:59:59.999+07:00`);

  const [{ data, error, count }, options] = await Promise.all([
    query.range(fromRow, fromRow + PAGE_SIZE - 1),
    loadMaintenanceOptions(supabase, { alarmId: prefillAlarm }),
  ]);
  const records = (data ?? []) as unknown as MaintenanceRecord[];
  const activeCount = Object.values(f).filter(Boolean).length;
  const filterParams = Object.fromEntries(Object.entries(f).filter(([, v]) => v)) as Record<string, string>;

  return (
    <>
      <PageHeader title="งานซ่อมบำรุง" description="บันทึกและติดตามงานซ่อมของเครื่องจักร" />

      <FilterBar action="/maintenance" activeCount={activeCount}>
        <FilterField label="ค้นหาปัญหา/การแก้ไข">
          <input className="input" name="q" defaultValue={f.q} />
        </FilterField>
        <FilterField label="เครื่องจักร">
          <select className="input" name="machine" defaultValue={f.machine}>
            <option value="">ทั้งหมด</option>
            {options.machines.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </FilterField>
        <FilterField label="ช่าง">
          <select className="input" name="technician" defaultValue={f.technician}>
            <option value="">ทั้งหมด</option>
            <option value="none">ยังไม่มีคนรับ</option>
            {options.technicians.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </FilterField>
        <FilterField label="สถานะ">
          <select className="input" name="status" defaultValue={f.status}>
            <option value="">ทั้งหมด</option>
            <option value="active">ยังไม่เสร็จ</option>
            {STATUSES.map((s) => <option key={s} value={s}>{MAINT_STATUS_LABEL[s]}</option>)}
          </select>
        </FilterField>
        <FilterField label="ประเภท">
          <select className="input" name="type" defaultValue={f.type}>
            <option value="">ทั้งหมด</option>
            {TYPES.map((t) => <option key={t} value={t}>{MAINT_TYPE_LABEL[t]}</option>)}
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
        ) : records.length === 0 ? (
          <EmptyState>{activeCount ? "ไม่พบงานที่ตรงกับตัวกรอง" : "ยังไม่มีงานซ่อม"}</EmptyState>
        ) : (
          <div className="relative overflow-x-auto">
            <table className="data-table">
              <caption className="sr-only">รายการงานซ่อมบำรุง</caption>
              <thead>
                <tr>
                  <th>เริ่ม</th>
                  <th>เครื่อง</th>
                  <th>ปัญหา</th>
                  <th>ช่าง</th>
                  <th>สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id}>
                    <td className="tabular text-sm whitespace-nowrap">{formatDateTime(r.started_at)}</td>
                    <td className="tabular whitespace-nowrap">{r.machine?.machine_code}</td>
                    <td>
                      <Link href={`/maintenance/${r.id}`} className="font-medium underline underline-offset-2">{r.problem}</Link>
                      <span className="block text-sm text-steel">{MAINT_TYPE_LABEL[r.maintenance_type]}</span>
                      {r.action_taken && <span className="block text-sm">แก้ไข: {r.action_taken}</span>}
                    </td>
                    <td>{r.technician?.full_name ?? <span className="text-steel">ยังไม่มีคนรับ</span>}</td>
                    <td>
                      <MaintStatusMark status={r.status} />
                      {r.completed_at && <span className="tabular block text-xs text-steel">{formatDateTime(r.completed_at)}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination basePath="/maintenance" params={filterParams} page={page} total={count ?? 0} shown={records.length} />
          </div>
        )}
      </Panel>

      {isStaff(profile) && (
        <section id="new">
          <Panel title="บันทึกงานซ่อมใหม่">
            <MaintenanceForm
              action={createMaintenance}
              {...options}
              defaults={{
                machine_id: f.machine || undefined,
                alarm_id: prefillAlarm || undefined,
                technician_id: profile.role === "technician" ? profile.id : undefined,
              }}
              submitLabel="บันทึกงานซ่อม"
            />
          </Panel>
        </section>
      )}
    </>
  );
}
