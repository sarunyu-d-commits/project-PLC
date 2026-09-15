"use client";

import { useActionState } from "react";
import { changeRole } from "./actions";
import { SubmitButton } from "@/components/form";
import { ROLE_LABEL } from "@/lib/labels";
import { initialActionState, type AppRole } from "@/lib/types";

export function RoleForm({ userId, role, name }: { userId: string; role: AppRole; name: string }) {
  const [state, action] = useActionState(changeRole, initialActionState);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="user_id" value={userId} />
      <label className="sr-only" htmlFor={`role-${userId}`}>สิทธิ์ของ {name}</label>
      <select id={`role-${userId}`} name="role" defaultValue={role} className="input w-auto">
        {(Object.keys(ROLE_LABEL) as AppRole[]).map((r) => (
          <option key={r} value={r}>{ROLE_LABEL[r]}</option>
        ))}
      </select>
      <SubmitButton className="btn btn-quiet" pendingText="กำลังบันทึก…">บันทึกสิทธิ์</SubmitButton>
      {state.message && (
        <span role={state.ok ? "status" : "alert"} className={`text-sm ${state.ok ? "text-run" : "text-alarm"}`}>
          {state.message}
        </span>
      )}
    </form>
  );
}
