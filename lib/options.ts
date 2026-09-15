import "server-only";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

/** รายการตัวเลือกสำหรับฟอร์มงานซ่อม */
export async function loadMaintenanceOptions(supabase: Client) {
  const [machines, techs, alarms] = await Promise.all([
    supabase.from("machines").select("id, machine_code, name").order("machine_code"),
    supabase.from("profiles").select("id, full_name, role").in("role", ["admin", "technician"]).order("full_name"),
    supabase
      .from("alarms")
      .select("id, alarm_code, occurred_at, machine:machines(machine_code)")
      .order("occurred_at", { ascending: false })
      .limit(100),
  ]);
  return {
    machines: (machines.data ?? []).map((m) => ({ id: m.id as string, label: `${m.machine_code} ${m.name}` })),
    technicians: (techs.data ?? []).map((t) => ({ id: t.id as string, label: t.full_name as string })),
    alarms: (alarms.data ?? []).map((a) => {
      const machine = a.machine as unknown as { machine_code: string } | null;
      return {
        id: a.id as string,
        label: `${machine?.machine_code ?? ""} ${a.alarm_code} (${new Date(a.occurred_at as string).toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok" })})`,
      };
    }),
  };
}
