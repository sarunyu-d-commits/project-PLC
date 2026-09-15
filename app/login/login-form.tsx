"use client";

import { useActionState } from "react";
import { login } from "./actions";
import { errProps, Field, FormMessage, SubmitButton } from "@/components/form";
import { initialActionState } from "@/lib/types";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(login, initialActionState);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      <FormMessage state={state} />
      <Field label="อีเมล" name="email" state={state}>
        <input className="input" type="email" defaultValue={state.values?.email} autoComplete="username" required {...errProps("email", state)} />
      </Field>
      <Field label="รหัสผ่าน" name="password" state={state}>
        <input className="input" type="password" autoComplete="current-password" required {...errProps("password", state)} />
      </Field>
      <SubmitButton pendingText="กำลังเข้าสู่ระบบ…">เข้าสู่ระบบ</SubmitButton>
    </form>
  );
}
