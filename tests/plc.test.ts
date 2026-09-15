import { describe, expect, it } from "vitest";
import { isStale, plcToMachineStatus } from "@/lib/domain/plc";

describe("PLC status mapping", () => {
  it("error bit wins over run", () => {
    expect(plcToMachineStatus({ M0: 1, M1: 1, M3: 1 })).toBe("alarm");
  });
  it("power and run = running", () => {
    expect(plcToMachineStatus({ M0: 1, M1: 1, M3: 0 })).toBe("running");
  });
  it("run without power = stop", () => {
    expect(plcToMachineStatus({ M0: 0, M1: 1, M3: 0 })).toBe("stop");
  });
  it("stale detection", () => {
    const now = new Date("2026-01-01T00:01:00Z");
    expect(isStale("2026-01-01T00:00:50Z", now)).toBe(false);
    expect(isStale("2026-01-01T00:00:00Z", now)).toBe(true);
    expect(isStale(null, now)).toBe(true);
  });
});
