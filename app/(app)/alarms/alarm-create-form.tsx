"use client";

import { useActionState, useEffect, useRef } from "react";
import { createAlarm } from "./actions";
import { errProps, Field, FormMessage, SubmitButton } from "@/components/form";
import { SEVERITY_LABEL } from "@/lib/labels";
import { initialActionState, type AlarmSeverity } from "@/lib/types";

function nowLocal() {
  // เวลาไทยในรูปแบบ datetime-local
  const d = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 16);
}

export function AlarmCreateForm({ machines, defaultMachine }: {
  machines: { id: string; machine_code: string; name: string }[];
  defaultMachine?: string;
}) {
  const [state, action] = useActionState(createAlarm, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);
  const timeRef = useRef<HTMLInputElement>(null);
  const v = state.ok ? undefined : state.values;

  // ตั้งค่าเวลาปัจจุบันหลัง render ฝั่ง browser (เลี่ยง hydration mismatch) และหลังบันทึกสำเร็จ
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
    const now = nowLocal();
    const keep = state.ok ? undefined : state.values?.occurred_at;
    if (timeRef.current) {
      timeRef.current.value = keep || now;
      timeRef.current.max = now;
    }
  }, [state]);

  return (
    <form ref={formRef} action={action} className="grid gap-4 sm:grid-cols-2" noValidate>
      <div className="sm:col-span-2"><FormMessage state={state} /></div>
      <Field label="เครื่องจักร" name="machine_id" state={state}>
        <select className="input" defaultValue={v?.machine_id ?? defaultMachine ?? ""} required {...errProps("machine_id", state)}>
          <option value="" disabled>เลือกเครื่อง</option>
          {machines.map((m) => (
            <option key={m.id} value={m.id}>{m.machine_code} {m.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Alarm Code" name="alarm_code" state={state} hint="เช่น HYD-OVP, E101">
        <input className="input tabular uppercase" defaultValue={v?.alarm_code} required maxLength={20} autoComplete="off" {...errProps("alarm_code", state)} />
      </Field>
      <Field label="รายละเอียด" name="description" state={state} className="sm:col-span-2">
        <input className="input" defaultValue={v?.description} required maxLength={500} {...errProps("description", state)} />
      </Field>
      <Field label="ระดับความรุนแรง" name="severity" state={state}>
        <select className="input" defaultValue={v?.severity ?? "medium"} {...errProps("severity", state)}>
          {(Object.keys(SEVERITY_LABEL) as AlarmSeverity[]).map((s) => (
            <option key={s} value={s}>{SEVERITY_LABEL[s]}</option>
          ))}
        </select>
      </Field>
      <Field label="วันเวลาที่เกิด" name="occurred_at" state={state}>
        <input
          className="input tabular"
          type="datetime-local"
          required
          ref={timeRef}
          {...errProps("occurred_at", state)}
        />
      </Field>
      <Field label="สาเหตุเบื้องต้น (ถ้าทราบ)" name="cause" state={state} className="sm:col-span-2">
        <input className="input" defaultValue={v?.cause} maxLength={500} {...errProps("cause", state)} />
      </Field>
      <div className="sm:col-span-2"><SubmitButton>บันทึก Alarm</SubmitButton></div>
    </form>
  );
}
