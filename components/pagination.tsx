import Link from "next/link";

export const PAGE_SIZE = 50;

function hrefFor(basePath: string, params: Record<string, string>, page: number) {
  const q = new URLSearchParams(params);
  if (page > 1) q.set("page", String(page));
  else q.delete("page");
  const s = q.toString();
  return s ? `${basePath}?${s}` : basePath;
}

/** แถบแบ่งหน้า ใช้ลิงก์ล้วน จึงทำงานได้แม้ไม่มี JavaScript และแชร์ลิงก์หน้าที่เปิดอยู่ได้ */
export function Pagination({ basePath, params, page, total, shown }: {
  basePath: string;
  /** ตัวกรองที่ใช้อยู่ (ไม่ต้องใส่ page) */
  params: Record<string, string>;
  page: number;
  total: number;
  shown: number;
}) {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const first = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const last = first === 0 ? 0 : first + shown - 1;

  return (
    <nav className="mt-3 flex flex-wrap items-center justify-between gap-3" aria-label="แบ่งหน้า">
      <p className="tabular text-sm text-steel">
        {total === 0 ? "ไม่มีรายการ" : `แสดง ${first}–${last} จาก ${total} รายการ`}
      </p>
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          {page > 1 ? (
            <Link className="btn btn-quiet" href={hrefFor(basePath, params, page - 1)} rel="prev">
              ← ก่อนหน้า
            </Link>
          ) : (
            <span className="btn btn-quiet opacity-45" aria-disabled="true">← ก่อนหน้า</span>
          )}
          <span className="tabular rounded-control bg-well px-2.5 py-1 text-sm text-steel">
            หน้า {page} จาก {totalPages}
          </span>
          {page < totalPages ? (
            <Link className="btn btn-quiet" href={hrefFor(basePath, params, page + 1)} rel="next">
              ถัดไป →
            </Link>
          ) : (
            <span className="btn btn-quiet opacity-45" aria-disabled="true">ถัดไป →</span>
          )}
        </div>
      )}
    </nav>
  );
}
