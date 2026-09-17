import "server-only";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

/** รายการตัวเลือกสำหรับฟอร์มงานซ่อม */
export async function loadMaintenanceOptions(
  supabase: Client,
  keep: { alarmId?: string | null; technicianId?: string | null } = {},
) {
  const [machines, techs, alarms] = await Promise.all([
    supabase.from("machines").select("id, machine_code, name").order("machine_code"),
    supabase.from("profiles").select("id, full_name, role").in("role", ["admin", "technician"]).order("full_name"),
    supabase
      .from("alarms")
      .select("id, alarm_code, occurred_at, machine:machines(machine_code)")
      .order("occurred_at", { ascending: false })
      .limit(100),
  ]);
  const technicians = (techs.data ?? []).map((t) => ({ id: t.id as string, label: t.full_name as string }));
  const alarmOptions = (alarms.data ?? []).map((a) => alarmOption(a));

  // ค่าที่เลือกไว้เดิมต้องอยู่ในตัวเลือกเสมอ ไม่อย่างนั้นบันทึกแล้วค่าจะหายเป็นค่าว่าง
  if (keep.technicianId && !technicians.some((t) => t.id === keep.technicianId)) {
    const { data } = await supabase.from("profiles").select("id, full_name").eq("id", keep.technicianId).maybeSingle();
    if (data) technicians.push({ id: data.id as string, label: `${data.full_name} (ไม่ได้เป็นช่างแล้ว)` });
  }
  if (keep.alarmId && !alarmOptions.some((a) => a.id === keep.alarmId)) {
    const { data } = await supabase
      .from("alarms")
      .select("id, alarm_code, occurred_at, machine:machines(machine_code)")
      .eq("id", keep.alarmId)
      .maybeSingle();
    if (data) alarmOptions.push(alarmOption(data));
  }

  return {
    machines: (machines.data ?? []).map((m) => ({ id: m.id as string, label: `${m.machine_code} ${m.name}` })),
    technicians,
    alarms: alarmOptions,
  };
}

function alarmOption(a: { id: unknown; alarm_code: unknown; occurred_at: unknown; machine: unknown }) {
  const machine = a.machine as { machine_code: string } | null;
  const date = new Date(a.occurred_at as string).toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok" });
  return { id: a.id as string, label: `${machine?.machine_code ?? ""} ${a.alarm_code} (${date})` };
}
