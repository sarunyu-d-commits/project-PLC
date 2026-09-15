import { EmptyState, PageHeader, Panel } from "@/components/page-header";
import { requireRole } from "@/lib/auth";
import { formatDateTime } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";

const TABLE_LABEL: Record<string, string> = {
  machines: "เครื่องจักร",
  alarms: "Alarm",
  maintenance_records: "งานซ่อม",
  profiles: "สิทธิ์ผู้ใช้",
};
const ACTION_LABEL: Record<string, string> = { INSERT: "เพิ่ม", UPDATE: "แก้ไข", DELETE: "ลบ" };

type Row = {
  id: number;
  actor_id: string | null;
  table_name: string;
  action: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  changed_at: string;
};

const IGNORED = new Set(["updated_at", "created_at", "last_seen_at"]);

function describe(row: Row): string {
  const d = row.new_data ?? row.old_data ?? {};
  const name = (d.machine_code ?? d.alarm_code ?? d.problem ?? d.full_name ?? "") as string;
  if (row.action !== "UPDATE" || !row.old_data || !row.new_data) return name;
  const changed = Object.keys(row.new_data).filter(
    (k) => !IGNORED.has(k) && JSON.stringify(row.new_data![k]) !== JSON.stringify(row.old_data![k]),
  );
  const parts = changed.slice(0, 3).map((k) => `${k}: ${String(row.old_data![k] ?? "–")} เป็น ${String(row.new_data![k] ?? "–")}`);
  return `${name} (${parts.join(", ") || "ไม่มีการเปลี่ยนแปลงสำคัญ"})`;
}

export default async function AuditPage() {
  await requireRole(["admin"]);
  const supabase = await createClient();
  const [{ data }, { data: people }] = await Promise.all([
    supabase.from("audit_logs").select("*").order("changed_at", { ascending: false }).limit(100),
    supabase.from("profiles").select("id, full_name"),
  ]);
  const rows = (data ?? []) as Row[];
  const names = new Map((people ?? []).map((p) => [p.id as string, p.full_name as string]));

  return (
    <>
      <PageHeader title="ประวัติการแก้ไข" description="100 รายการล่าสุด บันทึกโดยฐานข้อมูลอัตโนมัติ แก้ไขหรือลบไม่ได้" />
      <Panel>
        {rows.length === 0 ? (
          <EmptyState>ยังไม่มีประวัติ</EmptyState>
        ) : (
          <div className="relative overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr><th>เวลา</th><th>ผู้ทำ</th><th>รายการ</th><th>รายละเอียด</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="tabular text-sm whitespace-nowrap">{formatDateTime(r.changed_at)}</td>
                    <td>{r.actor_id ? names.get(r.actor_id) ?? "ผู้ใช้ที่ถูกลบ" : "PLC Gateway / ระบบ"}</td>
                    <td className="whitespace-nowrap">{ACTION_LABEL[r.action] ?? r.action}{TABLE_LABEL[r.table_name] ?? r.table_name}</td>
                    <td className="text-sm">{describe(r)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
