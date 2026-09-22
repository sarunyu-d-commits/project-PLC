-- ข้อมูลตัวอย่าง (รันหลัง schema.sql) — ไม่มีข้อมูลผู้ใช้ เพราะผู้ใช้สร้างผ่าน Supabase Auth
insert into public.machines (machine_code, name, machine_type, location, status, plc_linked) values
  -- plc_linked = false ทุกเครื่อง เพื่อให้สาธิตผ่านหน้าจำลองได้ทันทีโดยไม่ต้องรัน PLC Gateway
  -- ถ้าจะต่อ Gateway จริง ให้ติ๊ก "รับสถานะจาก PLC Gateway" ที่หน้าแก้ไขเครื่องจักร
  ('PUMP-01',  'Transfer Pump 1',        'Pump',       'Line A', 'running', false),
  ('CNC-01',   'CNC Lathe Okuma',        'CNC',        'Line A', 'running', false),
  ('CNC-02',   'CNC Milling Mazak',      'CNC',        'Line A', 'maintenance', false),
  ('PRS-01',   'Hydraulic Press 200T',   'Press',      'Line B', 'alarm', false),
  ('CONV-01',  'Conveyor Main',          'Conveyor',   'Line B', 'running', false),
  ('ROB-01',   'Welding Robot',          'Robot',      'Line B', 'stop', false),
  ('CMP-01',   'Air Compressor',         'Compressor', 'Utility', 'running', false),
  ('PKG-01',   'Packing Machine',        'Packaging',  'Line C', 'running', false)
on conflict (machine_code) do nothing;

insert into public.alarms (machine_id, alarm_code, description, severity, occurred_at, cause, action_taken, status)
select m.id, v.code, v.descr, v.sev::public.alarm_severity, now() - v.ago::interval, v.cause, v.act, v.st::public.alarm_status
from (values
  ('PRS-01',  'HYD-OVP',  'Hydraulic pressure over limit',  'high',   '2 hours',  null, null, 'open'),
  ('CNC-02',  'SPN-TEMP', 'Spindle temperature high',       'medium', '1 day',    'Coolant pump clogged', null, 'in_progress'),
  ('CONV-01', 'BELT-SLP', 'Belt slip detected',             'low',    '3 days',   'Belt tension low', 'Re-tensioned belt', 'closed'),
  ('ROB-01',  'SERVO-E1', 'Servo amplifier error',          'high',   '5 days',   'Encoder cable loose', 'Reconnected cable', 'closed'),
  ('CMP-01',  'AIR-LOW',  'Air pressure low',               'medium', '6 days',   'Leak at fitting', 'Replaced fitting', 'closed')
) as v(mcode, code, descr, sev, ago, cause, act, st)
join public.machines m on m.machine_code = v.mcode
where not exists (select 1 from public.alarms);

insert into public.maintenance_records (machine_id, maintenance_type, problem, action_taken, status, started_at)
select m.id, v.t::public.maintenance_type, v.problem, v.act, v.st::public.maintenance_status, now() - v.ago::interval
from (values
  ('CNC-02',  'corrective', 'Spindle overheating',          null,                    'waiting_part', '1 day'),
  ('CONV-01', 'corrective', 'Belt slipping',                'Re-tensioned belt',     'done',         '3 days'),
  ('CMP-01',  'preventive', 'Monthly filter check',         null,                    'pending',      '1 hour')
) as v(mcode, t, problem, act, st, ago)
join public.machines m on m.machine_code = v.mcode
where not exists (select 1 from public.maintenance_records);

-- หลังสร้างผู้ใช้คนแรกใน Authentication → Users แล้ว ให้รันคำสั่งนี้เพื่อตั้งเป็น Admin:
-- update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'you@example.com');
