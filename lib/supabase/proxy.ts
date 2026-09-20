import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "@/lib/env";

const PUBLIC_PATHS = ["/login"];

/** รีเฟรช session cookie และ redirect คนที่ยังไม่ Login (optimistic check) */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, key } = getSupabaseEnv();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // ห้ามแทรกโค้ดระหว่าง createServerClient กับ getClaims (ตามคำแนะนำของ @supabase/ssr)
  // getClaims ตรวจลายเซ็น JWT ในเครื่องเมื่อโปรเจคใช้ JWT signing keys แบบใหม่ จึงไม่ต้องเรียก Auth server ทุก request
  // ถ้าเป็นคีย์แบบเก่า (HS256) ไลบรารีจะเรียก getUser() ให้เองโดยอัตโนมัติ
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims ?? null;

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p));

  if (!user && !isPublic) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", path);
    return NextResponse.redirect(loginUrl);
  }

  if (user && path === "/login") {
    const home = request.nextUrl.clone();
    home.pathname = "/dashboard";
    home.search = "";
    return NextResponse.redirect(home);
  }

  return response;
}
