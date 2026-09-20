import { describe, expect, it } from "vitest";
import { checkSimAction, FAULT_PRESETS, findFault } from "@/lib/domain/simulator";

const base = { status: "running" as const, plcLinked: false, openAlarms: 0 };

describe("Simulator rules", () => {
  it("PLC-linked machines cannot be simulated", () => {
    for (const a of ["start", "stop", "maintenance", "fault"] as const) {
      expect(checkSimAction(a, { ...base, plcLinked: true })).not.toBeNull();
    }
  });

  it("cannot start or stop while alarms are open", () => {
    const m = { ...base, status: "alarm" as const, openAlarms: 1 };
    expect(checkSimAction("start", m)).toMatch(/ปิด Alarm/);
    expect(checkSimAction("stop", m)).not.toBeNull();
  });

  it("can send a faulted machine to maintenance", () => {
    expect(checkSimAction("maintenance", { ...base, status: "alarm", openAlarms: 1 })).toBeNull();
  });

  it("start after alarms are cleared", () => {
    expect(checkSimAction("start", { ...base, status: "stop" })).toBeNull();
    expect(checkSimAction("start", base)).toMatch(/อยู่แล้ว/);
  });

  it("fault is always allowed on non-PLC machines", () => {
    expect(checkSimAction("fault", { ...base, status: "maintenance", openAlarms: 3 })).toBeNull();
  });

  it("fault presets match the alarm_code format in the database", () => {
    for (const f of FAULT_PRESETS) expect(f.code).toMatch(/^[A-Z0-9][A-Z0-9_-]{1,19}$/);
    expect(findFault("OVERLOAD")?.severity).toBe("high");
    expect(findFault("NOPE")).toBeUndefined();
  });
});
