/**
 * ค่าที่ขึ้นต้นด้วย NEXT_PUBLIC_ จะถูกส่งไป Browser — ใส่ได้เฉพาะ URL และ publishable/anon key
 * ห้ามใส่ Service Role Key ในโปรเจค Next.js นี้เด็ดขาด (ใช้เฉพาะใน gateway/.env บนเครื่อง PLC)
 */
export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env.local.",
    );
  }
  return { url, key };
}
