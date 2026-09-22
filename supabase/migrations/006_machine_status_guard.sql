-- =====================================================================
-- 006: กันไม่ให้ตั้งเครื่องเป็น Running/Stop ขณะที่ยังมี Alarm ค้าง
-- สำหรับ Supabase ที่รัน schema.sql ไปแล้ว: SQL Editor → วางไฟล์นี้ → Run (รันซ้ำได้)
--
-- ก่อนแก้: หน้าจำลองเครื่องจักรกันไว้ แต่หน้าแก้ไขเครื่องจักรยังตั้ง Running ได้
-- ทั้งที่มี Alarm ค้าง ทำให้ Dashboard แสดงเครื่อง Running คู่กับ Alarm ที่ยังไม่ปิด
--
-- ยกเว้น: PLC Gateway (service role, auth.uid() เป็น null) และเครื่องที่ plc_linked = true
-- เพราะสถานะของเครื่องกลุ่มนั้นมาจาก PLC ไม่ใช่การกดของคน
-- =====================================================================

create or replace function public.machine_status_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or new.plc_linked then
    return new;
  end if;

  if new.status in ('running', 'stop')
     and new.status is distinct from old.status
     and exists (
       select 1 from public.alarms
       where machine_id = new.id and status <> 'closed'
     ) then
    raise exception 'machine has open alarms' using errcode = '23514';
  end if;

  return new;
end $$;

revoke execute on function public.machine_status_guard() from public, anon, authenticated;

drop trigger if exists trg_machine_status_guard on public.machines;
create trigger trg_machine_status_guard
  before update of status on public.machines
  for each row execute function public.machine_status_guard();
