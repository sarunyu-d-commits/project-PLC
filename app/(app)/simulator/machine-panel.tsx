"use client";

import Link from "next/link";
import { useActionState } from "react";
import { simulate } from "./actions";
import { MachineStatusMark } from "@/components/status";
import { checkSimAction, FAULT_PRESETS, SIM_ACTION_LABEL, type SimAction } from "@/lib/domain/simulator";
import { initialActionState, type Machine } from "@/lib/types";

type OpenAlarm = { id: string; alarm_code: string };

export function MachinePanel({ machine, openAlarms }: {
  machine: Pick<Machine, "id" | "machine_code" | "name" | "status" | "plc_linked">;
  openAlarms: OpenAlarm[];
}) {
  const [state, action, pending] = useActionState(simulate.bind(null, machine.id), initialActionState);
  const sim = { status: machine.status, plcLinked: machine.plc_linked, openAlarms: openAlarms.length };
  const reason = (a: SimAction) => checkSimAction(a, sim);

  const tone =
    machine.status === "alarm"
      ? "border-alarm bg-alarm-wash outline-1 -outline-offset-2 outline-alarm"
      : machine.status === "maintenance"
        ? "border-line bg-maint-wash"
        : "border-line bg-surface";

  const faultId = `fault-${machine.id}`;

  return (
    <article
      className={`flex flex-col gap-3 rounded-card border p-4 shadow-card ${tone}`}
      aria-labelledby={`title-${machine.id}`}
    >
      <header>
        <h3 id={`title-${machine.id}`} className="tabular text-lg font-semibold leading-tight">
          {machine.machine_code}
        </h3>
        <p className="truncate text-sm text-steel">{machine.name}</p>
      </header>

      <p className="text-lg">
        <MachineStatusMark status={machine.status} />
      </p>

      <p className="text-sm">
        {openAlarms.length === 0 ? (
          <span className="text-steel">ไม่มี Alarm ค้าง</span>
        ) : (
          <>
            Alarm ค้าง{" "}
            {openAlarms.map((a, i) => (
              <span key={a.id}>
                {i > 0 && ", "}
                <Link href={`/alarms/${a.id}`} className="font-semibold underline underline-offset-2">
                  {a.alarm_code}
                </Link>
              </span>
            ))}
          </>
        )}
      </p>

      {machine.plc_linked ? (
        <p className="border-t border-line pt-3 text-sm text-steel">
          รับสถานะจาก PLC Gateway จึงจำลองจากหน้านี้ไม่ได้
        </p>
      ) : (
        <form action={action} className="flex flex-col gap-3 border-t border-line pt-3">
          <div className="flex flex-wrap gap-2">
            {(["start", "stop", "maintenance"] as const).map((a) => {
              const why = reason(a);
              return (
                <button
                  key={a}
                  type="submit"
                  name="action"
                  value={a}
                  disabled={pending || why !== null}
                  title={why ?? undefined}
                  className={a === "start" ? "btn" : "btn btn-quiet"}
                >
                  {SIM_ACTION_LABEL[a]}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <label htmlFor={faultId} className="flex min-w-40 flex-1 flex-col gap-1 text-sm font-medium">
              ชนิด Fault
              <select id={faultId} name="fault" className="input" defaultValue={FAULT_PRESETS[0].code} disabled={pending}>
                {FAULT_PRESETS.map((f) => (
                  <option key={f.code} value={f.code}>
                    {f.code} {f.description}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" name="action" value="fault" disabled={pending} className="btn btn-danger">
              {SIM_ACTION_LABEL.fault}
            </button>
          </div>

          {openAlarms.length > 0 && (
            <p className="text-xs text-steel">ปิด Alarm ที่ค้างอยู่ก่อน จึงจะเดินหรือหยุดเครื่องได้</p>
          )}

          {pending ? (
            <p role="status" className="text-sm text-steel">กำลังส่งคำสั่ง…</p>
          ) : state.message ? (
            <p role={state.ok ? "status" : "alert"} className={`text-sm ${state.ok ? "text-run" : "font-medium text-alarm"}`}>
              {state.message}
            </p>
          ) : null}
        </form>
      )}
    </article>
  );
}
