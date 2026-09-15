import { RoleForm } from "./role-form";
import { PageHeader, Panel } from "@/components/page-header";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export default async function UsersPage() {
  const me = await requireRole(["admin"]);
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id, full_name, role").order("full_name");
  const users = (data ?? []) as Profile[];

  return (
    <>
      <PageHeader
        title="ผู้ใช้งานและสิทธิ์"
        description="ผู้ใช้ใหม่จะได้สิทธิ์ Viewer (ดูอย่างเดียว) จนกว่า Admin จะเปลี่ยนให้"
      />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[3fr_2fr]">
        <Panel>
          <div className="relative overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr><th>ชื่อ</th><th>สิทธิ์</th></tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      {u.full_name}
                      {u.id === me.id && <span className="ml-2 text-xs text-steel">(คุณ)</span>}
                    </td>
                    <td><RoleForm userId={u.id} role={u.role} name={u.full_name} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel title="สิทธิ์แต่ละระดับ">
          <dl className="flex flex-col gap-3 text-sm">
            <div><dt className="font-semibold">Admin</dt><dd>จัดการเครื่องจักร Alarm งานซ่อม และสิทธิ์ผู้ใช้ทั้งหมด เปิด Alarm ที่ปิดแล้วได้</dd></div>
            <div><dt className="font-semibold">Technician</dt><dd>ดูเครื่องจักร บันทึกและอัปเดต Alarm บันทึกและแก้ไขงานซ่อม</dd></div>
            <div><dt className="font-semibold">Viewer</dt><dd>ดูภาพรวมและข้อมูลได้อย่างเดียว</dd></div>
          </dl>
          <p className="mt-4 border-t border-line pt-3 text-sm text-steel">
            เพิ่มผู้ใช้ใหม่ได้ที่ Supabase Dashboard เมนู Authentication แล้วกลับมากำหนดสิทธิ์ที่หน้านี้
          </p>
        </Panel>
      </div>
    </>
  );
}
