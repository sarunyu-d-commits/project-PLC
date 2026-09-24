/** โครงหน้าจาง ๆ ระหว่างรอข้อมูล ทำให้เห็นว่าระบบกำลังทำงาน ไม่ใช่ค้าง */
export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">กำลังโหลดข้อมูล</span>
      <div className="mb-6 border-b border-line pb-4">
        <div className="skeleton h-7 w-56" />
        <div className="skeleton mt-2.5 h-4 w-80" />
      </div>
      <div className="skeleton mb-4 h-16 rounded-card" />
      <div className="rounded-card border border-line bg-surface p-4 shadow-card">
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-6" style={{ opacity: 1 - i * 0.12 }} />
          ))}
        </div>
      </div>
    </div>
  );
}
