"use client";

import { useActionState } from "react";
import { updateAlarm } from "../actions";
import { FormMessage, SubmitButton } from "@/components/form";
import { initialActionState, type Alarm } from "@/lib/types";

/** Admin เท่านั้น: เปิด Alarm ที่ปิดแล้วอีกครั้ง (แยกจากฟอร์มปกติ เพื่อไม่ให้กดบันทึกแล้วเปิดใหม่โดยไม่ตั้งใจ) */
export function ReopenAlarmForm({ alarm }: { alarm: Alarm }) {
  const [state, action] = useActionState(updateAlarm.bind(null, alarm.id), initialActionState);
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(`เปิด Alarm ${alarm.alarm_code} ใหม่? ผู้ปิดและเวลาปิดเดิมจะถูกล้าง`)) e.preventDefault();
      }}
      className="flex flex-col gap-3"
    >
      <FormMessage state={state} />
      <input type="hidden" name="status" value="open" />
      <input type="hidden" name="cause" value={alarm.cause ?? ""} />
      <input type="hidden" name="action_taken" value={alarm.action_taken ?? ""} />
      <p className="text-sm text-steel">
        Alarm นี้ปิดแล้วและแก้ไขไม่ได้ ถ้าปัญหากลับมา หรือต้องแก้สาเหตุ/การแก้ไข ให้เปิดใหม่ก่อน
      </p>
      <div>
        <SubmitButton className="btn btn-danger" pendingText="กำลังเปิด…">เปิด Alarm นี้ใหม่</SubmitButton>
      </div>
    </form>
  );
}
