/** โครงหน้าจาง ๆ ระหว่างรอข้อมูล ทำให้เห็นว่าระบบกำลังทำงาน ไม่ใช่ค้าง */
export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">กำลังโหลดข้อมูล</span>
      <div className="mb-6 border-b border-line pb-4">
        <div className="h-7 w-56 bg-well" />
        <div className="mt-2 h-4 w-80 bg-well" />
      </div>
      <div className="mb-4 h-16 border border-line bg-well" />
      <div className="border border-line bg-surface p-4">
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-6 bg-well" style={{ opacity: 1 - i * 0.12 }} />
          ))}
        </div>
      </div>
    </div>
  );
}
