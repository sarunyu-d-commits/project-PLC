import { LoginForm } from "./login-form";

export default async function LoginPage(props: PageProps<"/login">) {
  const { next } = await props.searchParams;
  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <svg viewBox="0 0 12 12" className="size-6 text-alarm" aria-hidden="true">
            <path d="M6 0.8 11.4 11H0.6Z" fill="currentColor" />
          </svg>
          <div>
            <p className="text-lg font-semibold leading-tight">Alarm &amp; Maintenance</p>
            <p className="text-sm text-steel">ระบบติดตาม Alarm และงานซ่อมเครื่องจักร</p>
          </div>
        </div>
        <div className="border border-line bg-surface p-6">
          <LoginForm next={typeof next === "string" ? next : undefined} />
        </div>
        <p className="mt-4 text-sm text-steel">
          ยังไม่มีบัญชี? ติดต่อ Admin ให้สร้างบัญชีและกำหนดสิทธิ์ให้
        </p>
      </div>
    </main>
  );
}
