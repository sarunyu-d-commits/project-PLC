import { LoginForm } from "./login-form";

export default async function LoginPage(props: PageProps<"/login">) {
  const { next } = await props.searchParams;
  return (
    <main className="grid min-h-dvh place-items-center bg-linear-to-b from-panel to-well p-6">
      <div className="w-full max-w-sm">
        <div className="mb-5 flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-card bg-shell" aria-hidden="true">
            <svg viewBox="0 0 12 12" className="size-5 text-alarm">
              <path d="M6 0.8 11.4 11H0.6Z" fill="currentColor" />
            </svg>
          </span>
          <div>
            <p className="text-lg leading-tight font-semibold">Alarm &amp; Maintenance</p>
            <p className="text-sm text-steel">ระบบติดตาม Alarm และงานซ่อมเครื่องจักร</p>
          </div>
        </div>
        <div className="rounded-card border border-line bg-surface p-6 shadow-raised">
          <h1 className="mb-4 text-lg font-semibold">เข้าสู่ระบบ</h1>
          <LoginForm next={typeof next === "string" ? next : undefined} />
        </div>
        <p className="mt-4 text-center text-sm text-steel">
          ยังไม่มีบัญชี? ติดต่อ Admin ให้สร้างบัญชีและกำหนดสิทธิ์ให้
        </p>
      </div>
    </main>
  );
}
