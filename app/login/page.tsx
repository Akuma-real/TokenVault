import { redirect } from "next/navigation";
import { readSessionFromCookies } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    <div className="min-h-[100svh] lg:grid lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-slate-900/75 via-slate-800/58 to-slate-900/72 text-slate-100 lg:flex">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(148,163,184,0.18)_0%,transparent_56%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_70%,rgba(94,234,212,0.15)_0%,transparent_48%)]" />
        <div className="absolute inset-0 opacity-40 [background:linear-gradient(120deg,transparent_25%,rgba(255,255,255,0.09)_48%,transparent_72%)]" />

        <div className="relative z-10 flex w-full items-center px-12 py-16">
          <div className="max-w-xl space-y-8">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-300/85">TokenVault Security Console</p>
              <h1 className="mt-4 text-5xl font-semibold tracking-tight text-slate-50">私有 2FA 控制中心</h1>
              <p className="mt-5 text-base leading-relaxed text-slate-200/86">
                统一管理验证码资产，按需取码并严格控制一次性分享。所有数据落地 Supabase，边缘环境只负责应用与 API 入口。
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Card className="border-white/18 bg-white/7 py-0 text-white backdrop-blur-sm">
                <CardContent className="px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-300/78">会话</p>
                  <p className="mt-2 text-sm font-semibold text-white">HttpOnly Cookie</p>
                </CardContent>
              </Card>
              <Card className="border-white/18 bg-white/7 py-0 text-white backdrop-blur-sm">
                <CardContent className="px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-300/78">分享</p>
                  <p className="mt-2 text-sm font-semibold text-white">严格一次性消费</p>
                </CardContent>
              </Card>
              <Card className="border-white/18 bg-white/7 py-0 text-white backdrop-blur-sm">
                <CardContent className="px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-300/78">默认 TTL</p>
                  <p className="mt-2 text-sm font-semibold text-white">300 秒</p>
                </CardContent>
              </Card>
            </div>

            <div className="rounded-2xl border border-white/18 bg-white/6 px-4 py-3 text-sm leading-relaxed text-slate-200/82">
              自动化脚本请使用后台生成 API Key（Bearer），并避免在客户端暴露服务级密钥。
            </div>
          </div>
        </div>
      </section>

      <section className="relative flex items-center justify-center bg-gradient-to-br from-slate-50/80 to-slate-100/65 px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <Card className="tv-card py-0">
            <CardContent className="p-6 sm:p-7">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="tv-kicker">Admin Access</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight">管理员登录</h2>
                </div>
                <Badge variant="outline">Session Gate</Badge>
              </div>

              <p className="mt-3 text-sm text-muted-foreground">使用 `ADMIN_PASSWORD` 完成认证后进入账户控制台。</p>

              {showError ? (
                <div className="mt-5 rounded-2xl border border-destructive/70 bg-destructive/10 p-3 text-sm text-destructive">
                  密码错误，请重试。
                </div>
              ) : null}

              <form className="mt-6 space-y-4" method="post" action="/api/auth/login">
                <div className="space-y-2">
                  <Label htmlFor="password">管理员密码</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    placeholder="请输入 ADMIN_PASSWORD"
                  />
                </div>

                <Button type="submit" className="w-full">
                  进入控制台
                </Button>
              </form>

              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                提示：脚本访问请使用后台生成的 API Key（Bearer Token）。
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
