import Link from "next/link";

/** ฟอร์มค้นหาแบบ GET — ทำงานได้แม้ไม่มี JavaScript และแชร์ลิงก์ผลค้นหาได้ */
export function FilterBar({ action, children, activeCount }: {
  action: string;
  children: React.ReactNode;
  activeCount: number;
}) {
  return (
    <form
      action={action}
      method="get"
      className="mb-4 flex flex-wrap items-end gap-3 rounded-card border border-line bg-well p-3 shadow-card"
      role="search"
    >
      {children}
      <div className="flex gap-2">
        <button type="submit" className="btn">ค้นหา</button>
        {activeCount > 0 && (
          <Link href={action} className="btn btn-quiet">ล้างตัวกรอง ({activeCount})</Link>
        )}
      </div>
    </form>
  );
}

export function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex min-w-36 flex-col gap-1 text-sm font-medium">
      <span className="text-steel">{label}</span>
      {children}
    </label>
  );
}
