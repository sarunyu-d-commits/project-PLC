-- =====================================================================
-- กำหนดชื่อและสิทธิ์ให้ผู้ใช้ที่สร้างไว้ใน Supabase Dashboard
-- รันหลังสร้างผู้ใช้ที่ Authentication > Users (ติ๊ก Auto Confirm User)
-- ผู้ใช้ใหม่ทุกคนได้สิทธิ์ viewer อัตโนมัติ ไฟล์นี้ยกระดับให้เฉพาะคนที่ต้องการ
-- แก้อีเมลให้ตรงกับที่สร้างไว้จริงก่อนรัน
-- =====================================================================

update public.profiles set full_name = 'ผู้ดูแลระบบ', role = 'admin'
where id = (select id from auth.users where email = 'admin@plant.test');

update public.profiles set full_name = 'ช่างซ่อมบำรุง', role = 'technician'
where id = (select id from auth.users where email = 'tech@plant.test');

update public.profiles set full_name = 'ฝ่ายผลิต'
where id = (select id from auth.users where email = 'viewer@plant.test');

-- ตรวจผล: ต้องได้ admin, technician และ viewer อย่างละคน
select u.email, p.full_name, p.role
from public.profiles p
join auth.users u on u.id = p.id
order by p.role;
