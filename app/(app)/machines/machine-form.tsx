"use client";

import { useActionState, useEffect, useRef } from "react";
import { errProps, Field, FormMessage, SubmitButton } from "@/components/form";
import { MACHINE_STATUS_LABEL } from "@/lib/labels";
import { initialActionState, type ActionState, type Machine, type MachineStatus } from "@/lib/types";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

export function MachineForm({ action, machine, submitLabel }: {
  action: Action;
  machine?: Machine;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);
  const v = state.ok ? undefined : state.values;

  useEffect(() => {
    // ฟอร์มเพิ่มใหม่: ล้างค่าหลังบันทึกสำเร็จ
    if (state.ok && !machine) formRef.current?.reset();
  }, [state, machine]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-4 sm:grid-cols-2" noValidate>
      <div className="sm:col-span-2">
        <FormMessage state={state} />
      </div>
      <Field label="Machine ID" name="machine_code" state={state} hint="ตัวพิมพ์ใหญ่ ตัวเลข และ - เช่น CNC-01">
        <input
          className="input tabular uppercase"
          defaultValue={v?.machine_code ?? machine?.machine_code}
          required
          maxLength={20}
          autoComplete="off"
          {...errProps("machine_code", state)}
        />
      </Field>
      <Field label="ชื่อเครื่อง" name="name" state={state}>
        <input className="input" defaultValue={v?.name ?? machine?.name} required maxLength={100} {...errProps("name", state)} />
      </Field>
      <Field label="ประเภท" name="machine_type" state={state} hint="เช่น CNC, Pump, Press">
        <input
          className="input"
          defaultValue={v?.machine_type ?? machine?.machine_type}
          required
          maxLength={50}
          list="machine-types"
          {...errProps("machine_type", state)}
        />
      </Field>
      <datalist id="machine-types">
        {["CNC", "Pump", "Press", "Conveyor", "Robot", "Compressor", "Packaging"].map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
      <Field label="ตำแหน่ง" name="location" state={state} hint="เช่น Line A">
        <input className="input" defaultValue={v?.location ?? machine?.location} required maxLength={100} {...errProps("location", state)} />
      </Field>
      <Field label="สถานะ" name="status" state={state}>
        <select className="input" defaultValue={v?.status ?? machine?.status ?? "stop"} {...errProps("status", state)}>
          {(Object.keys(MACHINE_STATUS_LABEL) as MachineStatus[]).map((s) => (
            <option key={s} value={s}>{MACHINE_STATUS_LABEL[s]}</option>
          ))}
        </select>
      </Field>
      <label className="flex items-start gap-2 self-end pb-2 text-sm">
        <input type="checkbox" name="plc_linked" defaultChecked={v ? v.plc_linked === "on" : machine?.plc_linked} className="mt-1 size-4" />
        <span>
          รับสถานะจาก PLC Gateway
          <span className="block text-xs text-steel">สถานะจะถูกเขียนทับโดย Gateway อัตโนมัติ</span>
        </span>
      </label>
      <div className="sm:col-span-2">
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
