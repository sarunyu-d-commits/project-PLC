"use client";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="border-l-4 border-alarm bg-alarm-wash p-4">
      <h2 className="font-semibold">โหลดหน้านี้ไม่สำเร็จ</h2>
      <p className="mt-1 text-sm">อาจเกิดจากการเชื่อมต่อฐานข้อมูล ลองใหม่อีกครั้ง หากยังไม่ได้ให้ตรวจสอบค่า Supabase ใน Environment Variables</p>
      <button type="button" onClick={reset} className="btn mt-3">ลองใหม่</button>
    </div>
  );
}
