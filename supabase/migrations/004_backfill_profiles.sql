-- =====================================================================
-- 004: สร้าง profile ให้ผู้ใช้ที่ถูกสร้างไว้ก่อนรัน schema.sql
-- trigger on_auth_user_created ทำงานเฉพาะผู้ใช้ใหม่ ผู้ใช้เก่าจึงไม่มีแถวใน profiles
-- รันซ้ำได้ ผู้ใช้ที่ได้เพิ่มจะได้สิทธิ์ viewer
-- =====================================================================
insert into public.profiles (id, full_name)
select u.id, coalesce(u.raw_user_meta_data ->> 'full_name', split_part(u.email, '@', 1))
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;
