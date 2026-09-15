"use client";

import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/types";

export function Field({
  label,
  name,
  state,
  hint,
  children,
  className = "",
}: {
  label: string;
  name: string;
  state?: ActionState;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const error = state?.fieldErrors?.[name];
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${name}-error`} className="text-sm text-alarm" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-steel">{hint}</p>
      ) : null}
    </div>
  );
}

/** props ที่ใส่ให้ input เพื่อผูกกับ error ของช่องนั้น */
export function errProps(name: string, state?: ActionState) {
  const invalid = Boolean(state?.fieldErrors?.[name]);
  return {
    id: name,
    name,
    "aria-invalid": invalid || undefined,
    "aria-describedby": invalid ? `${name}-error` : undefined,
  } as const;
}

export function SubmitButton({ children, pendingText = "กำลังบันทึก…", className = "btn" }: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending}>
      {pending ? pendingText : children}
    </button>
  );
}

export function FormMessage({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return (
    <p
      role={state.ok ? "status" : "alert"}
      className={`border-l-4 px-3 py-2 text-sm ${
        state.ok ? "border-run bg-surface" : "border-alarm bg-alarm-wash text-ink"
      }`}
    >
      {state.message}
    </p>
  );
}
