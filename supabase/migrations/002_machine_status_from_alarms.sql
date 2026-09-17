-- =====================================================================
-- 002: สถานะเครื่องเปลี่ยนตาม Alarm อัตโนมัติ
-- สำหรับ Supabase ที่รัน schema.sql ไปแล้ว: SQL Editor → วางไฟล์นี้ → Run (รันซ้ำได้)
--
-- กติกา
--   - มี Alarm ที่ยังไม่ปิด (Open / In Progress)  -> เครื่องเป็น 'alarm'
--   - ปิด Alarm ตัวสุดท้ายของเครื่อง              -> เครื่องเป็น 'stop'
--     (ไม่กลับเป็น running เอง ให้คนตรวจและตั้งสถานะเมื่อพร้อมเดินเครื่อง)
--   - เครื่องที่ plc_linked = true ไม่ถูกแตะ เพราะ PLC Gateway เป็นผู้กำหนดสถานะ
-- =====================================================================

create or replace function public.sync_machine_status_from_alarm()
returns trigger
language plpgsql
security definer            -- Technician แก้ตาราง machines เองไม่ได้ (RLS) แต่ trigger นี้ทำแทนได้
set search_path = public
as $$
declare
  m_status  public.machine_status;
  m_plc     boolean;
  remaining integer;
begin
  select status, plc_linked into m_status, m_plc
  from public.machines where id = new.machine_id
  for update;

  if m_plc then
    return null;
  end if;

  if new.status <> 'closed' then
    if m_status <> 'alarm' then
      update public.machines set status = 'alarm' where id = new.machine_id;
    end if;
  elsif tg_op = 'UPDATE' and old.status <> 'closed' then
    select count(*) into remaining
    from public.alarms
    where machine_id = new.machine_id and status <> 'closed';

    if remaining = 0 and m_status = 'alarm' then
      update public.machines set status = 'stop' where id = new.machine_id;
    end if;
  end if;

  return null;
end $$;

revoke execute on function public.sync_machine_status_from_alarm() from anon, authenticated;

drop trigger if exists trg_sync_machine_status on public.alarms;
create trigger trg_sync_machine_status
  after insert or update of status on public.alarms
  for each row execute function public.sync_machine_status_from_alarm();
