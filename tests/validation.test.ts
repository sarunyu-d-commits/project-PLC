import { describe, expect, it } from "vitest";
import {
  alarmCreateSchema,
  dbErrorMessage,
  localDateTimeToIso,
  machineSchema,
  maintenanceSchema,
} from "@/lib/validation";

const validMachine = {
  machine_code: "cnc-01",
  name: "CNC Lathe",
  machine_type: "CNC",
  location: "Line A",
  status: "running",
};

describe("REQ-MCH: Machine validation", () => {
  it("accepts valid input and upper-cases the ID", () => {
    const r = machineSchema.safeParse(validMachine);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.machine_code).toBe("CNC-01");
      expect(r.data.plc_linked).toBe(false);
    }
  });

  it("rejects empty required fields", () => {
    const r = machineSchema.safeParse({ ...validMachine, name: "   " });
    expect(r.success).toBe(false);
  });

  it("rejects machine IDs with invalid characters", () => {
    expect(machineSchema.safeParse({ ...validMachine, machine_code: "cnc 01!" }).success).toBe(false);
  });

  it("rejects unknown status", () => {
    expect(machineSchema.safeParse({ ...validMachine, status: "broken" }).success).toBe(false);
  });

  it("REQ-MCH-02: duplicate ID error from DB is shown clearly", () => {
    expect(
      dbErrorMessage({ code: "23505", message: 'duplicate key "machines_machine_code_key"' }),
    ).toBe("Machine ID นี้มีอยู่แล้ว");
  });
});

describe("Alarm validation", () => {
  const base = {
    machine_id: "3f1c2a4e-8b7d-4c6a-9e5f-1a2b3c4d5e6f",
    alarm_code: "hyd-ovp",
    description: "Pressure high",
    severity: "high",
    occurred_at: "2026-01-01T08:00",
  };

  it("converts Thai local time to ISO", () => {
    expect(localDateTimeToIso("2026-01-01T08:00")).toBe("2026-01-01T01:00:00.000Z");
    expect(localDateTimeToIso("not a date")).toBeNull();
  });

  it("accepts valid alarm", () => {
    const r = alarmCreateSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.alarm_code).toBe("HYD-OVP");
  });

  it("rejects alarms in the future", () => {
    expect(alarmCreateSchema.safeParse({ ...base, occurred_at: "2999-01-01T00:00" }).success).toBe(false);
  });

  it("rejects missing machine", () => {
    expect(alarmCreateSchema.safeParse({ ...base, machine_id: "" }).success).toBe(false);
  });
});

describe("Maintenance validation", () => {
  const base = {
    machine_id: "3f1c2a4e-8b7d-4c6a-9e5f-1a2b3c4d5e6f",
    maintenance_type: "corrective",
    problem: "Motor noise",
    status: "pending",
  };

  it("accepts minimal record", () => {
    expect(maintenanceSchema.safeParse(base).success).toBe(true);
  });

  it("requires action taken when done", () => {
    const r = maintenanceSchema.safeParse({ ...base, status: "done" });
    expect(r.success).toBe(false);
    expect(maintenanceSchema.safeParse({ ...base, status: "done", action_taken: "Replaced bearing" }).success).toBe(true);
  });
});

describe("withValues", () => {
  it("keeps typed values on failure but never the password", async () => {
    const { withValues } = await import("@/lib/validation");
    const fd = new FormData();
    fd.set("email", "a@b.co");
    fd.set("password", "secret");
    fd.set("$ACTION_ID_abc", "");
    const r = withValues({ ok: false, message: "x" }, fd);
    expect(r.values).toEqual({ email: "a@b.co" });
    expect(withValues({ ok: true }, fd).values).toBeUndefined();
  });
});

describe("pickUuid", () => {
  it("accepts a real uuid and rejects look-alikes", async () => {
    const { pickUuid } = await import("@/lib/query");
    expect(pickUuid("3f1c2a4e-8b7d-4c6a-9e5f-1a2b3c4d5e6f")).toBe("3f1c2a4e-8b7d-4c6a-9e5f-1a2b3c4d5e6f");
    for (const bad of ["-".repeat(36), "3f1c2a4e8b7d4c6a9e5f1a2b3c4d5e6f", "zzzzzzzz-8b7d-4c6a-9e5f-1a2b3c4d5e6f", "", 42]) {
      expect(pickUuid(bad)).toBe("");
    }
  });
});

describe("pickPage", () => {
  it("accepts 1..1000 and falls back to page 1", async () => {
    const { pickPage } = await import("@/lib/query");
    expect(pickPage("3")).toBe(3);
    expect(pickPage("1000")).toBe(1000);
    for (const bad of ["0", "-2", "1001", "abc", "2.5", "", undefined, 7]) {
      expect(pickPage(bad)).toBe(1);
    }
  });
});
