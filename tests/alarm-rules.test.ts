import { describe, expect, it } from "vitest";
import { allowedNextStatuses, checkAlarmUpdate } from "@/lib/domain/alarm";

describe("REQ-ALM-02: Alarm status transitions", () => {
  it("technician can move open → in_progress", () => {
    expect(checkAlarmUpdate({ from: "open", to: "in_progress", role: "technician" })).toBeNull();
  });

  it("closing requires cause and action taken", () => {
    expect(checkAlarmUpdate({ from: "open", to: "closed", role: "technician" })).toMatch(/Cause/);
    expect(
      checkAlarmUpdate({ from: "open", to: "closed", role: "technician", cause: "x" }),
    ).toMatch(/Action Taken/);
    expect(
      checkAlarmUpdate({ from: "in_progress", to: "closed", role: "technician", cause: "x", actionTaken: "y" }),
    ).toBeNull();
  });

  it("blank strings do not count as cause", () => {
    expect(
      checkAlarmUpdate({ from: "open", to: "closed", role: "admin", cause: "   ", actionTaken: "y" }),
    ).not.toBeNull();
  });

  it("only admin can reopen a closed alarm", () => {
    expect(checkAlarmUpdate({ from: "closed", to: "open", role: "technician" })).not.toBeNull();
    expect(checkAlarmUpdate({ from: "closed", to: "open", role: "admin" })).toBeNull();
    expect(allowedNextStatuses("closed", "technician")).toEqual(["closed"]);
  });

  it("closed cannot jump to in_progress", () => {
    expect(checkAlarmUpdate({ from: "closed", to: "in_progress", role: "admin" })).not.toBeNull();
  });

  it("viewer cannot update", () => {
    expect(checkAlarmUpdate({ from: "open", to: "in_progress", role: "viewer" })).not.toBeNull();
  });
});
