import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { sha256Hex } from "@/lib/crypto";
import { ConsumeClient } from "./ConsumeClient";

export const dynamic = "force-dynamic";

function formatTime(ts: string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString("zh-CN", { hour12: false });
}

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const tokenHash = await sha256Hex(token);

  const supabase = getSupabaseAdmin();
  const { data: rows, error } = await supabase.rpc("peek_share_token_with_account", {
    p_token_hash: tokenHash,
  });

  const share = Array.isArray(rows) && rows.length > 0
    ? (rows[0] as {
        account_id?: string;
        expires_at?: string;
        consumed_at?: string | null;
        is_valid?: boolean;
        label?: string;
        issuer?: string | null;
      })
    : null;

  const isValid = !!share?.is_valid;
  const isConsumed = !!share?.consumed_at;

  const label = share?.label?.trim() ? share.label : "账户";
  const issuer = share?.issuer ?? null;

  return (
    <div className="tv-container flex min-h-[100svh] max-w-md flex-col justify-center py-12">
      <div className="tv-card">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">一次性分享</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {!isValid ? "链接已失效" : "点击按钮后才会消费（严格一次性）"}
            </p>
          </div>
          <Link href="/" className="tv-link">
            首页
          </Link>
        </div>

        {error ? (
          <div className="mt-6 rounded-xl border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
            加载失败：{error.message}
          </div>
        ) : !isValid ? (
          <div className="mt-6 rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
            {isConsumed ? "该链接已被使用。" : "该链接已过期或不存在。"}
          </div>
        ) : (
          <>
            <div className="mt-6 rounded-2xl border bg-card p-4">
              <div className="text-sm font-medium">{label}</div>
              {issuer ? <div className="mt-1 text-xs text-muted-foreground">{issuer}</div> : null}
              {share?.expires_at ? (
                <div className="mt-3 text-xs text-muted-foreground">
                  过期时间：{formatTime(share.expires_at)}
                </div>
              ) : null}
            </div>
            <ConsumeClient token={token} initialLabel={label} />
          </>
        )}
      </div>
    </div>
  );
}
