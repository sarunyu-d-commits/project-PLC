import {
  ALARM_STATUS_LABEL,
  MACHINE_STATUS_LABEL,
  MAINT_STATUS_LABEL,
  SEVERITY_LABEL,
} from "@/lib/labels";
import type { AlarmSeverity, AlarmStatus, MachineStatus, MaintenanceStatus } from "@/lib/types";

type Shape = "circle" | "square" | "triangle" | "diamond" | "ring";

function Glyph({ shape, className }: { shape: Shape; className: string }) {
  return (
    <svg viewBox="0 0 12 12" className={`size-3 shrink-0 ${className}`} aria-hidden="true">
      {shape === "circle" && <circle cx="6" cy="6" r="5" fill="currentColor" />}
      {shape === "ring" && <circle cx="6" cy="6" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.6" />}
      {shape === "square" && <rect x="1.8" y="1.8" width="8.4" height="8.4" fill="none" stroke="currentColor" strokeWidth="1.6" />}
      {shape === "triangle" && <path d="M6 0.8 11.4 11H0.6Z" fill="currentColor" />}
      {shape === "diamond" && <path d="M6 0.6 11.4 6 6 11.4 0.6 6Z" fill="currentColor" />}
    </svg>
  );
}

const MACHINE: Record<MachineStatus, { shape: Shape; color: string }> = {
  running: { shape: "circle", color: "text-run" },
  stop: { shape: "square", color: "text-stop" },
  alarm: { shape: "triangle", color: "text-alarm" },
  maintenance: { shape: "diamond", color: "text-maint" },
};

export function MachineStatusMark({ status }: { status: MachineStatus }) {
  const s = MACHINE[status];
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <Glyph shape={s.shape} className={`${s.color} ${status === "alarm" ? "blink" : ""}`} />
      <span className={status === "alarm" ? "font-semibold text-alarm" : ""}>
        {MACHINE_STATUS_LABEL[status]}
      </span>
    </span>
  );
}

export function AlarmStatusMark({ status }: { status: AlarmStatus }) {
  const map: Record<AlarmStatus, { shape: Shape; color: string; blink: boolean }> = {
    open: { shape: "triangle", color: "text-alarm", blink: true },
    in_progress: { shape: "triangle", color: "text-maint", blink: false },
    closed: { shape: "ring", color: "text-stop", blink: false },
  };
  const s = map[status];
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <Glyph shape={s.shape} className={`${s.color} ${s.blink ? "blink" : ""}`} />
      <span className={status === "open" ? "font-semibold text-alarm" : ""}>{ALARM_STATUS_LABEL[status]}</span>
    </span>
  );
}

export function SeverityMark({ severity }: { severity: AlarmSeverity }) {
  const bars = { low: 1, medium: 2, high: 3 }[severity];
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap" title={`ความรุนแรง: ${SEVERITY_LABEL[severity]}`}>
      <span className="inline-flex items-end gap-px" aria-hidden="true">
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={`w-1 ${i <= bars ? (severity === "high" ? "bg-alarm" : "bg-ink") : "bg-line"}`}
            style={{ height: `${4 + i * 3}px` }}
          />
        ))}
      </span>
      <span>{SEVERITY_LABEL[severity]}</span>
    </span>
  );
}

export function MaintStatusMark({ status }: { status: MaintenanceStatus }) {
  const map: Record<MaintenanceStatus, { shape: Shape; color: string }> = {
    pending: { shape: "ring", color: "text-steel" },
    in_progress: { shape: "diamond", color: "text-maint" },
    waiting_part: { shape: "diamond", color: "text-maint" },
    done: { shape: "circle", color: "text-stop" },
  };
  const s = map[status];
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <Glyph shape={s.shape} className={s.color} />
      <span className={status === "waiting_part" ? "font-semibold text-maint" : ""}>{MAINT_STATUS_LABEL[status]}</span>
    </span>
  );
}
