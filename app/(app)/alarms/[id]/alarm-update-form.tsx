"use client";

import { useActionState, useState } from "react";
import { updateAlarm } from "../actions";
import { errProps, Field, FormMessage, SubmitButton } from "@/components/form";
import { ALARM_STATUS_LABEL } from "@/lib/labels";
import { initialActionState, type Alarm, type AlarmStatus } from "@/lib/types";

export function AlarmUpdateForm({ alarm, allowed }: { alarm: Alarm; allowed: AlarmStatus[] }) {
  const [state, action] = useActionState(updateAlarm.bind(null, alarm.id), initialActionState);
  const v = state.ok ? undefined : state.values;
  const initialStatus = (v?.status as AlarmStatus | undefined) ?? alarm.status;
  // ใช้ select แบบ uncontrolled: React 19 รีเซ็ตฟอร์มหลัง action จึงต้องให้ defaultValue เป็นค่าที่ถูกต้องเสมอ
  const [picked, setPicked] = useState<{ from: AlarmStatus; to: AlarmStatus } | null>(null);
  const status = picked && picked.from === initialStatus ? picked.to : initialStatus;
  const closing = status === "closed";

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />
      <Field label="สถานะ" name="status" state={state}>
        <select
          className="input"
          key={initialStatus}
          defaultValue={initialStatus}
          onChange={(e) => setPicked({ from: initialStatus, to: e.target.value as AlarmStatus })}
          {...errProps("status", state)}
        >
          {allowed.map((s) => <option key={s} value={s}>{ALARM_STATUS_LABEL[s]}</option>)}
        </select>
      </Field>
      <Field label={closing ? "สาเหตุ (จำเป็นก่อนปิด)" : "สาเหตุ"} name="cause" state={state}>
        <textarea className="input" rows={2} maxLength={500} defaultValue={v?.cause ?? alarm.cause ?? ""} required={closing} {...errProps("cause", state)} />
      </Field>
      <Field label={closing ? "การแก้ไข (จำเป็นก่อนปิด)" : "การแก้ไข"} name="action_taken" state={state}>
        <textarea className="input" rows={3} maxLength={1000} defaultValue={v?.action_taken ?? alarm.action_taken ?? ""} required={closing} {...errProps("action_taken", state)} />
      </Field>
      <div><SubmitButton>{closing && alarm.status !== "closed" ? "ปิด Alarm" : "บันทึก"}</SubmitButton></div>
      {closing && alarm.status !== "closed" && (
        <p className="text-sm text-steel">
          ถ้าเป็น Alarm สุดท้ายของเครื่อง สถานะเครื่องจะเปลี่ยนเป็น Stop ให้ Admin ตั้งเป็น Running เมื่อตรวจแล้วพร้อมเดินเครื่อง
        </p>
      )}
    </form>
  );
}
