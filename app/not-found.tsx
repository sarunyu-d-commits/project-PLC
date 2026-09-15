import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center p-6 text-center">
      <div>
        <h1 className="text-2xl font-semibold">ไม่พบหน้าที่ต้องการ</h1>
        <p className="mt-2 text-steel">รายการนี้อาจถูกลบไปแล้ว หรือลิงก์ไม่ถูกต้อง</p>
        <Link href="/dashboard" className="btn mt-6">กลับไปหน้าภาพรวม</Link>
      </div>
    </main>
  );
}
