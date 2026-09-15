-- =====================================================================
-- Alarm & Maintenance Management System — Supabase schema
-- วิธีใช้: Supabase Dashboard → SQL Editor → วางทั้งไฟล์ → Run
-- รันซ้ำได้ (idempotent) ในระดับ table/function/policy
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. Enum types
-- ---------------------------------------------------------------------
do $$ begin
  create type public.app_role as enum ('admin', 'technician', 'viewer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.machine_status as enum ('running', 'stop', 'alarm', 'maintenance');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.alarm_status as enum ('open', 'in_progress', 'closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.alarm_severity as enum ('low', 'medium', 'high');
exception when duplicate_object then null; end $$;

do $$ begin
  -- waiting_part = Change Request ตัวอย่างในโจทย์
  create type public.maintenance_status as enum ('pending', 'in_progress', 'waiting_part', 'done');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.maintenance_type as enum ('corrective', 'preventive');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- 2. Tables
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '',
  role        public.app_role not null default 'viewer',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.machines (
  id            uuid primary key default gen_random_uuid(),
  machine_code  text not null unique
                check (machine_code ~ '^[A-Z0-9][A-Z0-9-]{1,19}$'),
  name          text not null check (char_length(trim(name)) between 1 and 100),
  machine_type  text not null check (char_length(trim(machine_type)) between 1 and 50),
  location      text not null check (char_length(trim(location)) between 1 and 100),
  status        public.machine_status not null default 'stop',
  -- ถ้า true = สถานะมาจาก PLC Gateway (Source of Truth คือ PLC)
  plc_linked    boolean not null default false,
  last_seen_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.alarms (
  id            uuid primary key default gen_random_uuid(),
  -- on delete restrict: ห้ามลบเครื่องที่มีประวัติ เพื่อไม่ให้ประวัติหาย
  machine_id    uuid not null references public.machines (id) on delete restrict,
  alarm_code    text not null check (alarm_code ~ '^[A-Z0-9][A-Z0-9_-]{1,19}$'),
  description   text not null check (char_length(trim(description)) between 1 and 500),
  severity      public.alarm_severity not null default 'medium',
  occurred_at   timestamptz not null default now(),
  cause         text check (cause is null or char_length(cause) <= 500),
  action_taken  text check (action_taken is null or char_length(action_taken) <= 1000),
  status        public.alarm_status not null default 'open',
  source        text not null default 'manual' check (source in ('manual', 'plc')),
  created_by    uuid references public.profiles (id) on delete set null,
  closed_by     uuid references public.profiles (id) on delete set null,
  closed_at     timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- ปิด Alarm ได้ต่อเมื่อมี Cause และ Action Taken (Rule จากบทที่ 2)
  constraint alarm_closed_requires_detail check (
    status <> 'closed'
    or (nullif(trim(cause), '') is not null
        and nullif(trim(action_taken), '') is not null
        and closed_at is not null)
  ),
  constraint alarm_not_in_future check (occurred_at <= now() + interval '5 minutes')
);

-- กัน PLC Gateway สร้าง Alarm ซ้ำ ขณะที่ Alarm เดิมยังไม่ปิด (idempotency)
create unique index if not exists alarms_one_active_plc_alarm
  on public.alarms (machine_id, alarm_code)
  where source = 'plc' and status <> 'closed';

create index if not exists alarms_machine_idx  on public.alarms (machine_id);
create index if not exists alarms_status_idx   on public.alarms (status);
create index if not exists alarms_occurred_idx on public.alarms (occurred_at desc);

create table if not exists public.maintenance_records (
  id                uuid primary key default gen_random_uuid(),
  machine_id        uuid not null references public.machines (id) on delete restrict,
  alarm_id          uuid references public.alarms (id) on delete set null,
  technician_id     uuid references public.profiles (id) on delete set null,
  maintenance_type  public.maintenance_type not null default 'corrective',
  problem           text not null check (char_length(trim(problem)) between 1 and 1000),
  action_taken      text check (action_taken is null or char_length(action_taken) <= 1000),
  status            public.maintenance_status not null default 'pending',
  started_at        timestamptz not null default now(),
  completed_at      timestamptz,
  created_by        uuid references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint maintenance_done_requires_action check (
    status <> 'done'
    or (nullif(trim(action_taken), '') is not null and completed_at is not null)
  ),
  constraint maintenance_dates_order check (completed_at is null or completed_at >= started_at)
);

create index if not exists maint_machine_idx on public.maintenance_records (machine_id);
create index if not exists maint_status_idx  on public.maintenance_records (status);
create index if not exists maint_tech_idx    on public.maintenance_records (technician_id);

create table if not exists public.audit_logs (
  id          bigint generated always as identity primary key,
  actor_id    uuid,
  table_name  text not null,
  record_id   uuid,
  action      text not null,
  old_data    jsonb,
  new_data    jsonb,
  changed_at  timestamptz not null default now()
);

create index if not exists audit_changed_idx on public.audit_logs (changed_at desc);

-- ---------------------------------------------------------------------
-- 3. Helper functions (security definer เพื่อใช้ใน RLS โดยไม่วนซ้ำ)
-- ---------------------------------------------------------------------
create or replace function public.current_app_role()
returns public.app_role
language sql stable security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(public.current_app_role() = 'admin', false)
$$;

create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(public.current_app_role() in ('admin', 'technician'), false)
$$;

revoke execute on function public.current_app_role() from anon;
revoke execute on function public.is_admin() from anon;
revoke execute on function public.is_staff() from anon;

-- ---------------------------------------------------------------------
-- 4. Triggers
-- ---------------------------------------------------------------------

-- 4.1 updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();
drop trigger if exists trg_machines_updated on public.machines;
create trigger trg_machines_updated before update on public.machines
  for each row execute function public.set_updated_at();
drop trigger if exists trg_alarms_updated on public.alarms;
create trigger trg_alarms_updated before update on public.alarms
  for each row execute function public.set_updated_at();
drop trigger if exists trg_maint_updated on public.maintenance_records;
create trigger trg_maint_updated before update on public.maintenance_records
  for each row execute function public.set_updated_at();

-- 4.2 สร้าง profile อัตโนมัติเมื่อมีผู้ใช้ใหม่ (Role เริ่มต้น = viewer)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4.3 Alarm status transition + บันทึก closed_by / closed_at
create or replace function public.alarm_status_guard()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(new.created_by, auth.uid());
    if new.status = 'closed' then
      new.closed_at := coalesce(new.closed_at, now());
      new.closed_by := coalesce(new.closed_by, auth.uid());
    end if;
    return new;
  end if;

  if old.status = 'closed' and new.status <> 'closed' then
    -- Alarm ที่ปิดแล้ว เปิดใหม่ได้เฉพาะ Admin (auth.uid() เป็น null = service role/gateway)
    if auth.uid() is not null and not public.is_admin() then
      raise exception 'Only admin can reopen a closed alarm' using errcode = '42501';
    end if;
    new.closed_at := null;
    new.closed_by := null;
  elsif old.status <> 'closed' and new.status = 'closed' then
    new.closed_at := now();
    new.closed_by := auth.uid();
  end if;
  return new;
end $$;

drop trigger if exists trg_alarm_status_guard on public.alarms;
create trigger trg_alarm_status_guard before insert or update on public.alarms
  for each row execute function public.alarm_status_guard();

-- 4.4 Maintenance: ตั้ง completed_at อัตโนมัติ
create or replace function public.maintenance_status_guard()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(new.created_by, auth.uid());
  end if;
  if new.status = 'done' and (tg_op = 'INSERT' or old.status <> 'done') then
    new.completed_at := coalesce(new.completed_at, now());
  elsif new.status <> 'done' then
    new.completed_at := null;
  end if;
  return new;
end $$;

drop trigger if exists trg_maint_status_guard on public.maintenance_records;
create trigger trg_maint_status_guard before insert or update on public.maintenance_records
  for each row execute function public.maintenance_status_guard();

-- 4.5 กัน Admin ลด Role ตัวเองจนไม่มี Admin เหลือ
create or replace function public.keep_one_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.role = 'admin' and new.role <> 'admin'
     and (select count(*) from public.profiles where role = 'admin' and id <> old.id) = 0 then
    raise exception 'System must keep at least one admin' using errcode = '23514';
  end if;
  return new;
end $$;

drop trigger if exists trg_keep_one_admin on public.profiles;
create trigger trg_keep_one_admin before update of role on public.profiles
  for each row execute function public.keep_one_admin();

-- 4.6 Audit Log
create or replace function public.write_audit_log()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_logs (actor_id, table_name, record_id, action, old_data, new_data)
  values (
    auth.uid(),
    tg_table_name,
    case when tg_op = 'DELETE' then old.id else new.id end,
    tg_op,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end $$;

drop trigger if exists trg_audit_machines on public.machines;
create trigger trg_audit_machines after insert or delete on public.machines
  for each row execute function public.write_audit_log();
-- update ของ machines บันทึกเฉพาะที่ไม่ได้มาจาก gateway (ไม่งั้น log จะเต็มจาก heartbeat)
drop trigger if exists trg_audit_machines_upd on public.machines;
create trigger trg_audit_machines_upd after update on public.machines
  for each row when (auth.uid() is not null)
  execute function public.write_audit_log();

drop trigger if exists trg_audit_alarms on public.alarms;
create trigger trg_audit_alarms after insert or update or delete on public.alarms
  for each row execute function public.write_audit_log();
drop trigger if exists trg_audit_maint on public.maintenance_records;
create trigger trg_audit_maint after insert or update or delete on public.maintenance_records
  for each row execute function public.write_audit_log();
drop trigger if exists trg_audit_profiles on public.profiles;
create trigger trg_audit_profiles after update of role on public.profiles
  for each row execute function public.write_audit_log();

-- ---------------------------------------------------------------------
-- 5. Row Level Security
-- ---------------------------------------------------------------------
alter table public.profiles            enable row level security;
alter table public.machines            enable row level security;
alter table public.alarms              enable row level security;
alter table public.maintenance_records enable row level security;
alter table public.audit_logs          enable row level security;

-- profiles
drop policy if exists "profiles: read by signed-in users" on public.profiles;
create policy "profiles: read by signed-in users" on public.profiles
  for select to authenticated using (true);
drop policy if exists "profiles: admin updates" on public.profiles;
create policy "profiles: admin updates" on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- machines: ทุกคนที่ Login อ่านได้, Admin เท่านั้นที่ CRUD
drop policy if exists "machines: read" on public.machines;
create policy "machines: read" on public.machines
  for select to authenticated using (true);
drop policy if exists "machines: admin insert" on public.machines;
create policy "machines: admin insert" on public.machines
  for insert to authenticated with check (public.is_admin());
drop policy if exists "machines: admin update" on public.machines;
create policy "machines: admin update" on public.machines
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "machines: admin delete" on public.machines;
create policy "machines: admin delete" on public.machines
  for delete to authenticated using (public.is_admin());

-- alarms: อ่านได้ทุกคน, Admin/Technician สร้างและแก้ไขได้ (ไม่มี delete ตามโจทย์)
drop policy if exists "alarms: read" on public.alarms;
create policy "alarms: read" on public.alarms
  for select to authenticated using (true);
drop policy if exists "alarms: staff insert" on public.alarms;
create policy "alarms: staff insert" on public.alarms
  for insert to authenticated with check (public.is_staff() and source = 'manual');
drop policy if exists "alarms: staff update" on public.alarms;
create policy "alarms: staff update" on public.alarms
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

-- maintenance_records
drop policy if exists "maintenance: read" on public.maintenance_records;
create policy "maintenance: read" on public.maintenance_records
  for select to authenticated using (true);
drop policy if exists "maintenance: staff insert" on public.maintenance_records;
create policy "maintenance: staff insert" on public.maintenance_records
  for insert to authenticated with check (public.is_staff());
drop policy if exists "maintenance: staff update" on public.maintenance_records;
create policy "maintenance: staff update" on public.maintenance_records
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

-- audit_logs: Admin อ่านได้อย่างเดียว (เขียนผ่าน trigger เท่านั้น)
drop policy if exists "audit: admin read" on public.audit_logs;
create policy "audit: admin read" on public.audit_logs
  for select to authenticated using (public.is_admin());

-- anon ไม่มีสิทธิ์อะไรเลย
revoke all on public.profiles, public.machines, public.alarms,
             public.maintenance_records, public.audit_logs from anon;

-- สิทธิ์ระดับตาราง (Supabase ให้ค่าเริ่มต้นนี้อยู่แล้ว ใส่ไว้ให้ชัดเจน — RLS ด้านบนเป็นตัวคุมจริง)
grant select, insert, update, delete on public.profiles, public.machines, public.alarms,
      public.maintenance_records to authenticated;
grant select on public.audit_logs to authenticated;
