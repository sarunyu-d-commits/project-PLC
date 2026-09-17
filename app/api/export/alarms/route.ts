import type { NextRequest } from "next/server";
import { buildAlarmQuery, parseAlarmFilters } from "@/lib/alarm-query";
import { fetchAll } from "@/lib/fetch-all";
import { getCurrentProfile } from "@/lib/auth";
import { ALARM_STATUS_LABEL, SEVERITY_LABEL } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";
import type { Alarm } from "@/lib/types";

function csvCell(value: unknown): string {
  let s = value == null ? "" : String(value);
  // กัน CSV/Formula injection เมื่อเปิดใน Excel
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile) return new Response("Unauthorized", { status: 401 });

  const sp = Object.fromEntries(request.nextUrl.searchParams.entries());
  const supabase = await createClient();
  const filters = parseAlarmFilters(sp);
  const { rows: data, error, truncated } = await fetchAll(
    (from, to) => buildAlarmQuery(supabase, filters).range(from, to),
    { max: 50_000 },
  );
  if (error) return new Response("Export failed", { status: 500 });

  const header = ["Occurred At", "Machine ID", "Machine Name", "Alarm Code", "Description", "Severity", "Status", "Cause", "Action Taken", "Closed At", "Closed By", "Source"];
  const rows = ((data ?? []) as unknown as Alarm[]).map((a) => [
    a.occurred_at,
    a.machine?.machine_code,
    a.machine?.name,
    a.alarm_code,
    a.description,
    SEVERITY_LABEL[a.severity],
    ALARM_STATUS_LABEL[a.status],
    a.cause,
    a.action_taken,
    a.closed_at,
    a.closer?.full_name,
    a.source,
  ]);

  // ใส่ BOM เพื่อให้ Excel อ่านภาษาไทยถูก
  const csv = "\uFEFF" + [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="alarms-${stamp}.csv"`,
      "Cache-Control": "no-store",
      ...(truncated ? { "X-Export-Truncated": "50000" } : {}),
    },
  });
}
