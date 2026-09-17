-- =====================================================================
-- 003: ปิดช่องโหว่สิทธิ์ที่เรียกผ่าน Supabase API โดยตรง
-- สำหรับ Supabase ที่รัน schema.sql ไปแล้ว: SQL Editor → วางไฟล์นี้ → Run (รันซ้ำได้)
--
-- ก่อนแก้: Technician ที่เรียก API ตรง (ไม่ผ่านหน้าเว็บ) สามารถ
--   - ใส่ created_by / closed_by เป็นชื่อคนอื่น
--   - เปลี่ยน machine_id, alarm_code, source ของ Alarm เดิม
--   - แก้สาเหตุ/การแก้ไขของ Alarm ที่ปิดแล้ว
-- =====================================================================

-- 1) ผู้บันทึก / ผู้ปิด มาจาก session เสมอ ไม่รับค่าจาก client
create or replace function public.alarm_status_guard()
returns trigger language plpgsql as $$
declare
  uid uuid := auth.uid();   -- null = service role (PLC Gateway)
begin
  if tg_op = 'INSERT' then
    if uid is not null then
      new.created_by := uid;
      new.closed_by := null;
      new.closed_at := null;
    end if;
    if new.status = 'closed' then
      new.closed_at := coalesce(new.closed_at, now());
      new.closed_by := coalesce(new.closed_by, uid);
    end if;
    return new;
  end if;

  -- ข้อมูลตั้งต้นของ Alarm แก้ไม่ได้หลังบันทึก (ยกเว้น service role)
  if uid is not null and (
       new.machine_id is distinct from old.machine_id
    or new.alarm_code is distinct from old.alarm_code
    or new.source     is distinct from old.source
    or new.created_by is distinct from old.created_by
    or new.occurred_at is distinct from old.occurred_at) then
    raise exception 'Alarm origin fields cannot be changed' using errcode = '42501';
  end if;

  -- Alarm ที่ปิดแล้ว: Technician แก้ไม่ได้ Admin ต้องเปิดใหม่ก่อน
  if old.status = 'closed' and new.status = 'closed' and uid is not null
     and (new.cause is distinct from old.cause or new.action_taken is distinct from old.action_taken
          or new.description is distinct from old.description or new.severity is distinct from old.severity) then
    raise exception 'Closed alarm is read-only; reopen it first' using errcode = '42501';
  end if;

  if old.status = 'closed' and new.status <> 'closed' then
    if uid is not null and not public.is_admin() then
      raise exception 'Only admin can reopen a closed alarm' using errcode = '42501';
    end if;
    new.closed_at := null;
    new.closed_by := null;
  elsif old.status <> 'closed' and new.status = 'closed' then
    new.closed_at := now();
    new.closed_by := uid;
  else
    -- ไม่ได้เปลี่ยนสถานะ: ผู้ปิดและเวลาปิดคงเดิม
    new.closed_at := old.closed_at;
    new.closed_by := old.closed_by;
  end if;
  return new;
end $$;

create or replace function public.maintenance_status_guard()
returns trigger language plpgsql as $$
declare
  uid uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    if uid is not null then
      new.created_by := uid;
    end if;
  else
    new.created_by := old.created_by;
    if uid is not null then
      new.started_at := old.started_at;
    end if;
  end if;

  if new.status = 'done' and (tg_op = 'INSERT' or old.status <> 'done') then
    new.completed_at := now();
  elsif new.status = 'done' then
    new.completed_at := old.completed_at;
  else
    new.completed_at := null;
  end if;
  return new;
end $$;

-- 2) Helper functions: PostgreSQL ให้สิทธิ์ EXECUTE กับ PUBLIC เป็นค่าเริ่มต้น
revoke execute on function public.current_app_role() from public, anon;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.is_staff() from public, anon;
grant execute on function public.current_app_role() to authenticated, service_role;
grant execute on function public.is_admin() to authenticated, service_role;
grant execute on function public.is_staff() to authenticated, service_role;
revoke execute on function public.sync_machine_status_from_alarm() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.write_audit_log() from public, anon, authenticated;
revoke execute on function public.keep_one_admin() from public, anon, authenticated;
