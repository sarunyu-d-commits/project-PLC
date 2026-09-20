-- =====================================================================
-- 005: รองรับหน้าจำลองเครื่องจักร (/simulator)
-- สำหรับ Supabase ที่รัน schema.sql ไปแล้ว: SQL Editor → วางไฟล์นี้ → Run (รันซ้ำได้)
--
-- - เพิ่มแหล่งที่มาของ Alarm แบบ 'sim' เพื่อแยก Alarm จำลองออกจาก Alarm จริง
-- - สร้าง Alarm แบบ 'sim' ได้เฉพาะ Admin
-- - กันกด Fault ซ้ำ: เครื่องเดียวกันมี Alarm จำลองรหัสเดียวกันค้างได้ครั้งละ 1 รายการ
-- =====================================================================

alter table public.alarms drop constraint if exists alarms_source_check;
alter table public.alarms add constraint alarms_source_check
  check (source in ('manual', 'plc', 'sim'));

drop policy if exists "alarms: staff insert" on public.alarms;
create policy "alarms: staff insert" on public.alarms
  for insert to authenticated
  with check (
    public.is_staff()
    and (source = 'manual' or (source = 'sim' and public.is_admin()))
  );

create unique index if not exists alarms_one_active_sim_alarm
  on public.alarms (machine_id, alarm_code)
  where source = 'sim' and status <> 'closed';
