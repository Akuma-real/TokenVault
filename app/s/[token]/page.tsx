import Link from "next/link";
import { ConsumeClient } from "./ConsumeClient";
import { loadSharePreview } from "@/lib/share-preview";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

function formatTime(ts: string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString("zh-CN", { hour12: false });
}

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const previewResult = await loadSharePreview(token);
  const error = previewResult.ok ? null : previewResult.error;
  const preview = previewResult.ok
    ? previewResult.value
    : { isValid: false, isConsumed: false, label: "账户", issuer: null, expiresAt: null };

  return (
    <div className="tv-page max-w-2xl justify-center gap-6">
      <Card className="tv-card py-0">
        <CardContent className="p-6 sm:p-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="tv-kicker">One-time Share</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">一次性分享</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {!preview.isValid ? "链接已失效" : "预览不会消费，点击按钮后才会消费（严格一次性）"}
              </p>
            </div>
            <Link href="/" className="tv-link">
              首页
            </Link>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Card className="tv-card-compact py-0">
              <CardContent className="px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">消费策略</p>
                <p className="mt-2 text-sm font-semibold">Atomic Consume</p>
              </CardContent>
            </Card>
            <Card className="tv-card-compact py-0">
              <CardContent className="px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">缓存策略</p>
                <p className="mt-2 text-sm font-semibold">no-store</p>
              </CardContent>
            </Card>
            <Card className="tv-card-compact py-0">
              <CardContent className="px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">状态</p>
                <p className="mt-2 text-sm font-semibold">{preview.isValid ? "可消费" : "不可用"}</p>
              </CardContent>
            </Card>
          </div>

          {error ? (
            <div className="mt-6 rounded-2xl border border-destructive/70 bg-destructive/10 p-3 text-sm text-destructive">
              加载失败：{error}
            </div>
          ) : !preview.isValid ? (
            <div className="tv-panel-note mt-6">
              {preview.isConsumed ? "该链接已被使用。" : "该链接已过期或不存在。"}
            </div>
          ) : (
            <>
              <div className="mt-6 rounded-2xl border border-border/70 bg-card/80 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">{preview.label}</div>
                    {preview.issuer ? <div className="mt-1 text-xs text-muted-foreground">{preview.issuer}</div> : null}
                  </div>
                  <Badge variant="outline">只可消费一次</Badge>
                </div>
                {preview.expiresAt ? (
                  <div className="mt-3 text-xs text-muted-foreground">
                    过期时间：{formatTime(preview.expiresAt)}
                  </div>
                ) : null}
              </div>
              <ConsumeClient token={token} initialLabel={preview.label} linkExpiresAt={preview.expiresAt} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
