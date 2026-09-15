/** ทำความสะอาดคำค้นก่อนใส่ใน filter ของ PostgREST (กันตัวอักษรพิเศษทำ query พัง) */
export function cleanSearch(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/[,()%*\\]/g, " ").trim().slice(0, 50);
}

export function pickString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function pickEnum<T extends string>(value: unknown, allowed: readonly T[]): T | "" {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : "";
}

export function pickDate(value: unknown): string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

export function pickUuid(value: unknown): string {
  return typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value) ? value : "";
}
