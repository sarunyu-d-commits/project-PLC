import "server-only";

/**
 * Supabase จำกัดผลลัพธ์ต่อ request (ค่าเริ่มต้น 1,000 แถว) และตัดทิ้งเงียบ ๆ
 * ฟังก์ชันนี้ดึงทีละหน้าจนครบ หรือจนถึง max
 */
export async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  { pageSize = 1000, max = 50_000 } = {},
): Promise<{ rows: T[]; truncated: boolean; error: { message: string } | null }> {
  const rows: T[] = [];
  for (let from = 0; from < max; from += pageSize) {
    const to = Math.min(from + pageSize, max) - 1;
    const { data, error } = await page(from, to);
    if (error) return { rows, truncated: false, error };
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < to - from + 1) return { rows, truncated: false, error: null };
  }
  return { rows, truncated: true, error: null };
}
