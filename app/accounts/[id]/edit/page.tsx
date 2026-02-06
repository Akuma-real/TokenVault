import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { readSessionFromCookies } from "@/lib/auth";
import { getAccountForEdit } from "@/lib/account-repo";
import { Card, CardContent } from "@/components/ui/card";
import { AccountForm } from "../../AccountForm";

export const dynamic = "force-dynamic";

export default async function EditAccountPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await readSessionFromCookies();
  if (!session) redirect("/login");

  const { id } = await params;
  const { data, error } = await getAccountForEdit(id);

  if (error || !data) notFound();

  return (
    <div className="tv-page max-w-4xl gap-6">
      <Card className="tv-card py-0">
        <CardContent className="p-6 sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="tv-kicker">Edit Account</p>
              <h1 className="tv-title mt-2">编辑账户</h1>
              <p className="tv-subtitle">可更新名称、算法与参数；切换类型时请补充新的 Secret。</p>
            </div>
            <Link href="/accounts" className="tv-link">
              返回账户列表
            </Link>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Card className="tv-card-compact py-0">
              <CardContent className="px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">账户 ID</p>
                <p className="mt-2 truncate text-sm font-semibold">{data.id}</p>
              </CardContent>
            </Card>
            <Card className="tv-card-compact py-0">
              <CardContent className="px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">当前算法</p>
                <p className="mt-2 text-sm font-semibold">{(data.algorithm ?? "SHA1").toUpperCase()}</p>
              </CardContent>
            </Card>
            <Card className="tv-card-compact py-0">
              <CardContent className="px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">当前周期</p>
                <p className="mt-2 text-sm font-semibold">{data.period ?? 30}s</p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Card className="tv-card py-0">
        <CardContent className="p-6 sm:p-7">
          <AccountForm
            mode="edit"
            accountId={data.id}
            initial={{
              label: data.label ?? "",
              issuer: data.issuer ?? "",
              digits: data.digits ?? 6,
              period: data.period ?? 30,
              algorithm: (data.algorithm ?? "SHA1").toUpperCase() === "STEAM" ? "STEAM" : "SHA1",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
