import { redirect } from "next/navigation";
import { readSessionFromCookies } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const session = await readSessionFromCookies();
  if (session) redirect("/accounts");
  const sp = await searchParams;
  const showError = sp.e === "1";

  return (
    <div className="tv-container flex min-h-[100svh] max-w-md flex-col justify-center py-12">
      <div className="tv-card">
        <h1 className="text-xl font-semibold">TokenVault 登录</h1>
        <p className="mt-2 text-sm text-muted-foreground">使用 ADMIN_PASSWORD 登录（会话写入 HttpOnly Cookie）。</p>
        {showError ? (
          <div className="mt-4 rounded-xl border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
            密码错误
          </div>
        ) : null}

        <form className="mt-6 space-y-4" method="post" action="/api/auth/login">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="password">
              管理员密码
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="tv-input"
              autoComplete="current-password"
            />
          </div>
          <button
            type="submit"
            className="tv-btn tv-btn-primary w-full"
          >
            登录
          </button>
        </form>
      </div>
    </div>
  );
}
