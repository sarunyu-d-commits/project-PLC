"use client";

import { useActionState } from "react";
import { deleteMachine } from "../actions";
import { FormMessage } from "@/components/form";
import { initialActionState } from "@/lib/types";

export function DeleteMachineButton({ id, code }: { id: string; code: string }) {
  const [state, action, pending] = useActionState(deleteMachine.bind(null, id), initialActionState);
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(`ลบเครื่อง ${code}? การลบย้อนกลับไม่ได้`)) e.preventDefault();
      }}
      className="flex flex-col gap-3"
    >
      <FormMessage state={state} />
      <p className="text-sm text-steel">ลบได้เฉพาะเครื่องที่ยังไม่มีประวัติ Alarm หรืองานซ่อม เพื่อรักษาประวัติไว้</p>
      <div>
        <button type="submit" className="btn btn-danger" disabled={pending}>
          {pending ? "กำลังลบ…" : `ลบเครื่อง ${code}`}
        </button>
      </div>
    </form>
  );
}
