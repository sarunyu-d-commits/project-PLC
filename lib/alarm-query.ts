import "server-only";
import { cleanSearch, pickDate, pickEnum, pickUuid } from "@/lib/query";
import type { createClient } from "@/lib/supabase/server";
import type { AlarmSeverity, AlarmStatus } from "@/lib/types";

export const ALARM_STATUSES: AlarmStatus[] = ["open", "in_progress", "closed"];
export const SEVERITIES: AlarmSeverity[] = ["low", "medium", "high"];

export function parseAlarmFilters(sp: Record<string, string | string[] | undefined>) {
  const rawStatus = typeof sp.status === "string" ? sp.status : "";
  return {
    q: cleanSearch(sp.q),
    machine: pickUuid(sp.machine),
    status: rawStatus === "active" ? ("active" as const) : pickEnum(rawStatus, ALARM_STATUSES),
    severity: pickEnum(sp.severity, SEVERITIES),
    from: pickDate(sp.from),
    to: pickDate(sp.to),
  };
}

export type AlarmFilters = ReturnType<typeof parseAlarmFilters>;

type Client = Awaited<ReturnType<typeof createClient>>;

/** ใช้ร่วมกันระหว่างหน้า Alarm และการ Export CSV เพื่อให้ผลลัพธ์ตรงกัน */
export function buildAlarmQuery(supabase: Client, f: AlarmFilters) {
  let query = supabase
    .from("alarms")
    .select(
      "id, alarm_code, description, severity, status, occurred_at, cause, action_taken, source, closed_at, machine_id, machine:machines(machine_code, name), closer:profiles!alarms_closed_by_fkey(full_name)",
    )
    .order("occurred_at", { ascending: false });
  if (f.q) query = query.or(`alarm_code.ilike.%${f.q}%,description.ilike.%${f.q}%`);
  if (f.machine) query = query.eq("machine_id", f.machine);
  if (f.status === "active") query = query.neq("status", "closed");
  else if (f.status) query = query.eq("status", f.status);
  if (f.severity) query = query.eq("severity", f.severity);
  if (f.from) query = query.gte("occurred_at", `${f.from}T00:00:00+07:00`);
  if (f.to) query = query.lte("occurred_at", `${f.to}T23:59:59.999+07:00`);
  return query;
}
