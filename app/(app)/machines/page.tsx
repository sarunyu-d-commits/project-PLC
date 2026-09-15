import Link from "next/link";
import { MachineForm } from "./machine-form";
import { createMachine } from "./actions";
import { FilterBar, FilterField } from "@/components/filter-bar";
import { EmptyState, PageHeader, Panel } from "@/components/page-header";
import { MachineStatusMark } from "@/components/status";
import { isAdmin, requireProfile } from "@/lib/auth";
import { MACHINE_STATUS_LABEL } from "@/lib/labels";
import { cleanSearch, pickEnum, pickString } from "@/lib/query";
import { createClient } from "@/lib/supabase/server";
import type { Machine, MachineStatus } from "@/lib/types";

const STATUSES = Object.keys(MACHINE_STATUS_LABEL) as MachineStatus[];

export default async function MachinesPage(props: PageProps<"/machines">) {
  const profile = await requireProfile();
  const sp = await props.searchParams;
  const q = cleanSearch(sp.q);
  const status = pickEnum(sp.status, STATUSES);
  const type = pickString(sp.type);
  const location = pickString(sp.location);

  const supabase = await createClient();
  let query = supabase
    .from("machines")
    .select("id, machine_code, name, machine_type, location, status, plc_linked, last_seen_at, updated_at")
    .order("machine_code");
  if (q) query = query.or(`machine_code.ilike.%${q}%,name.ilike.%${q}%`);
  if (status) query = query.eq("status", status);
  if (type) query = query.eq("machine_type", type);
  if (location) query = query.eq("location", location);

  const [{ data, error }, { data: all }] = await Promise.all([
    query,
    supabase.from("machines").select("machine_type, location"),
  ]);
  const machines = (data ?? []) as Machine[];
  const types = [...new Set((all ?? []).map((m) => m.machine_type as string))].sort();
  const locations = [...new Set((all ?? []).map((m) => m.location as string))].sort();
  const activeCount = [q, status, type, location].filter(Boolean).length;

  return (
    <>
      <PageHeader
        title="เครื่องจักร"
        description={isAdmin(profile) ? "เพิ่ม แก้ไข และลบข้อมูลเครื่องจักร" : "ข้อมูลเครื่องจักรทั้งหมดในโรงงาน"}
      />

      {sp.deleted && (
        <p role="status" className="mb-4 border-l-4 border-run bg-surface px-3 py-2 text-sm">ลบเครื่องจักรแล้ว</p>
      )}

      <FilterBar action="/machines" activeCount={activeCount}>
        <FilterField label="ค้นหา ID หรือชื่อ">
          <input className="input" name="q" defaultValue={q} placeholder="เช่น CNC" />
        </FilterField>
        <FilterField label="สถานะ">
          <select className="input" name="status" defaultValue={status}>
            <option value="">ทั้งหมด</option>
            {STATUSES.map((s) => <option key={s} value={s}>{MACHINE_STATUS_LABEL[s]}</option>)}
          </select>
        </FilterField>
        <FilterField label="ประเภท">
          <select className="input" name="type" defaultValue={type}>
            <option value="">ทั้งหมด</option>
            {types.map((t) => <option key={t}>{t}</option>)}
          </select>
        </FilterField>
        <FilterField label="ตำแหน่ง">
          <select className="input" name="location" defaultValue={location}>
            <option value="">ทั้งหมด</option>
            {locations.map((l) => <option key={l}>{l}</option>)}
          </select>
        </FilterField>
      </FilterBar>

      <Panel className="mb-6">
        {error ? (
          <p role="alert" className="text-alarm">โหลดข้อมูลไม่สำเร็จ กรุณารีเฟรชหน้า</p>
        ) : machines.length === 0 ? (
          <EmptyState>{activeCount ? "ไม่พบเครื่องที่ตรงกับตัวกรอง" : "ยังไม่มีเครื่องจักร"}</EmptyState>
        ) : (
          <div className="relative overflow-x-auto">
            <table className="data-table">
              <caption className="sr-only">รายการเครื่องจักร</caption>
              <thead>
                <tr>
                  <th>Machine ID</th>
                  <th>ชื่อเครื่อง</th>
                  <th>ประเภท</th>
                  <th>ตำแหน่ง</th>
                  <th>สถานะ</th>
                  <th><span className="sr-only">การกระทำ</span></th>
                </tr>
              </thead>
              <tbody>
                {machines.map((m) => (
                  <tr key={m.id} data-abnormal={m.status === "alarm"}>
                    <td className="tabular font-semibold whitespace-nowrap">{m.machine_code}</td>
                    <td>{m.name}{m.plc_linked && <span className="ml-2 text-xs text-steel">PLC</span>}</td>
                    <td>{m.machine_type}</td>
                    <td>{m.location}</td>
                    <td><MachineStatusMark status={m.status} /></td>
                    <td className="text-right">
                      <Link href={`/machines/${m.id}`} className="underline underline-offset-2">
                        {isAdmin(profile) ? "ดู / แก้ไข" : "ดูประวัติ"}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-sm text-steel">แสดง {machines.length} เครื่อง</p>
          </div>
        )}
      </Panel>

      {isAdmin(profile) && (
        <Panel title="เพิ่มเครื่องจักร">
          <MachineForm action={createMachine} submitLabel="เพิ่มเครื่องจักร" />
        </Panel>
      )}
    </>
  );
}
