import { describe, expect, it } from "vitest";
import { safeNext } from "@/lib/safe-redirect";

describe("safeNext (open redirect guard)", () => {
  it("allows internal paths", () => {
    expect(safeNext("/machines")).toBe("/machines");
    expect(safeNext("/alarms?status=open")).toBe("/alarms?status=open");
  });
  it.each(["//evil.com", "/\\evil.com", "https://evil.com", "/\t/evil.com", "", undefined, "machines"])(
    "rejects %s",
    (value) => {
      expect(safeNext(value as string | undefined)).toBe("/dashboard");
    },
  );
});
