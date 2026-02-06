import Link from "next/link";
import { ConsumeClient } from "./ConsumeClient";
import { loadSharePreview } from "@/lib/share-preview";

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
    <div className="tv-container flex min-h-[100svh] max-w-md flex-col justify-center py-12">
      <div className="tv-card">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">一次性分享</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {!preview.isValid ? "链接已失效" : "点击按钮后才会消费（严格一次性）"}
            </p>
          </div>
          <Link href="/" className="tv-link">
            首页
          </Link>
        </div>

        {error ? (
          <div className="mt-6 rounded-xl border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
            加载失败：{error}
          </div>
        ) : !preview.isValid ? (
          <div className="mt-6 rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
            {preview.isConsumed ? "该链接已被使用。" : "该链接已过期或不存在。"}
          </div>
        ) : (
          <>
            <div className="mt-6 rounded-2xl border bg-card p-4">
              <div className="text-sm font-medium">{preview.label}</div>
              {preview.issuer ? <div className="mt-1 text-xs text-muted-foreground">{preview.issuer}</div> : null}
              {preview.expiresAt ? (
                <div className="mt-3 text-xs text-muted-foreground">
                  过期时间：{formatTime(preview.expiresAt)}
                </div>
              ) : null}
            </div>
            <ConsumeClient token={token} initialLabel={preview.label} />
          </>
        )}
      </div>
    </div>
  );
}
