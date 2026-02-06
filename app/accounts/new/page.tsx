import { redirect } from "next/navigation";
import Link from "next/link";
import { readSessionFromCookies } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { AccountForm } from "../AccountForm";

export const dynamic = "force-dynamic";

export default async function NewAccountPage() {
  const session = await readSessionFromCookies();
  if (!session) redirect("/login");

  return (
    <div className="tv-page max-w-4xl gap-6">
      <Card className="tv-card py-0">
        <CardContent className="p-6 sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="tv-kicker">Create Account</p>
              <h1 className="tv-title mt-2">新增账户</h1>
              <p className="tv-subtitle">新增后可在列表实时取码，并支持严格一次性分享。</p>
            </div>
            <Link href="/accounts" className="tv-link">
              返回账户列表
            </Link>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Card className="tv-card-compact py-0">
              <CardContent className="px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">默认算法</p>
                <p className="mt-2 text-sm font-semibold">SHA1 TOTP</p>
              </CardContent>
            </Card>
            <Card className="tv-card-compact py-0">
              <CardContent className="px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">推荐周期</p>
                <p className="mt-2 text-sm font-semibold">30 秒</p>
              </CardContent>
            </Card>
            <Card className="tv-card-compact py-0">
              <CardContent className="px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">分享模型</p>
                <p className="mt-2 text-sm font-semibold">One-time Token</p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Card className="tv-card py-0">
        <CardContent className="p-6 sm:p-7">
          <AccountForm
            mode="create"
            initial={{ label: "", issuer: "", digits: 6, period: 30, algorithm: "SHA1" }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
