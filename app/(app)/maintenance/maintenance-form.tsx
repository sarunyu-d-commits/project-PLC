"use client";

import { useActionState, useEffect, useRef } from "react";
import { errProps, Field, FormMessage, SubmitButton } from "@/components/form";
import { MAINT_STATUS_LABEL, MAINT_TYPE_LABEL } from "@/lib/labels";
import {
  initialActionState,
  type ActionState,
  type MaintenanceRecord,
  type MaintenanceStatus,
  type MaintenanceType,
} from "@/lib/types";

type Option = { id: string; label: string };

export function MaintenanceForm({
  action,
  record,
  machines,
  technicians,
  alarms,
  defaults,
  submitLabel,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  record?: MaintenanceRecord;
  machines: Option[];
  technicians: Option[];
  alarms: Option[];
  defaults?: { machine_id?: string; alarm_id?: string; technician_id?: string };
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);
  const v = state.ok ? undefined : state.values;
  useEffect(() => {
    if (state.ok && !record) formRef.current?.reset();
  }, [state, record]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-4 sm:grid-cols-2" noValidate>
      <div className="sm:col-span-2"><FormMessage state={state} /></div>
      <Field label="เครื่องจักร" name="machine_id" state={state}>
        <select className="input" required defaultValue={v?.machine_id ?? record?.machine_id ?? defaults?.machine_id ?? ""} {...errProps("machine_id", state)}>
          <option value="" disabled>เลือกเครื่อง</option>
          {machines.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
      </Field>
      <Field label="ประเภทงาน" name="maintenance_type" state={state}>
        <select className="input" defaultValue={v?.maintenance_type ?? record?.maintenance_type ?? "corrective"} {...errProps("maintenance_type", state)}>
          {(Object.keys(MAINT_TYPE_LABEL) as MaintenanceType[]).map((t) => (
            <option key={t} value={t}>{MAINT_TYPE_LABEL[t]}</option>
          ))}
        </select>
      </Field>
      <Field label="ช่างผู้รับผิดชอบ" name="technician_id" state={state}>
        <select className="input" defaultValue={v?.technician_id ?? record?.technician_id ?? defaults?.technician_id ?? ""} {...errProps("technician_id", state)}>
          <option value="">ยังไม่ระบุ</option>
          {technicians.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </Field>
      <Field label="อ้างอิง Alarm (ถ้ามี)" name="alarm_id" state={state}>
        <select className="input" defaultValue={v?.alarm_id ?? record?.alarm_id ?? defaults?.alarm_id ?? ""} {...errProps("alarm_id", state)}>
          <option value="">ไม่อ้างอิง</option>
          {alarms.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
        </select>
      </Field>
      <Field label="ปัญหาที่พบ" name="problem" state={state} className="sm:col-span-2">
        <textarea className="input" rows={2} required maxLength={1000} defaultValue={v?.problem ?? record?.problem} {...errProps("problem", state)} />
      </Field>
      <Field label="การแก้ไข" name="action_taken" state={state} className="sm:col-span-2" hint="จำเป็นเมื่อเปลี่ยนสถานะเป็น 'เสร็จแล้ว'">
        <textarea className="input" rows={3} maxLength={1000} defaultValue={v?.action_taken ?? record?.action_taken ?? ""} {...errProps("action_taken", state)} />
      </Field>
      <Field label="สถานะ" name="status" state={state}>
        <select className="input" defaultValue={v?.status ?? record?.status ?? "pending"} {...errProps("status", state)}>
          {(Object.keys(MAINT_STATUS_LABEL) as MaintenanceStatus[]).map((s) => (
            <option key={s} value={s}>{MAINT_STATUS_LABEL[s]}</option>
          ))}
        </select>
      </Field>
      <div className="self-end sm:justify-self-end"><SubmitButton>{submitLabel}</SubmitButton></div>
    </form>
  );
}
