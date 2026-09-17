/**
 * กัน open redirect: รับเฉพาะ path ภายในเว็บ
 * browser แปลง "/\\evil.com" เป็น "//evil.com" จึงต้องกัน backslash และช่องว่าง/อักขระควบคุมด้วย
 */
export function safeNext(next: string | undefined | null): string {
  return next && /^\/(?![/\\])[^\\\s]*$/.test(next) ? next : "/dashboard";
}
