"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type ConsumeOk = {
  payload: {
    account: { id: string; label: string; issuer: string | null };
    code: string;
    ttl: number;
  };
  consumedAt: string | null;
};

export function ConsumeClient(props: { token: string; initialLabel: string; linkExpiresAt: string | null }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [ttl, setTtl] = useState<number | null>(null);
  const [linkTtl, setLinkTtl] = useState<number | null>(null);
  const [codeExpired, setCodeExpired] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!props.linkExpiresAt) {
      setLinkTtl(null);
      return;
    }
    const expiresAtMs = new Date(props.linkExpiresAt).getTime();
    if (Number.isNaN(expiresAtMs)) {
      setLinkTtl(null);
      return;
    }

    const tick = () => {
      const seconds = Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000));
      setLinkTtl(seconds);
    };

    tick();
    const linkTimer = window.setInterval(tick, 1000);
    return () => window.clearInterval(linkTimer);
  }, [props.linkExpiresAt]);

  useEffect(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    if (ttl === null) return;
    timerRef.current = window.setInterval(() => {
      setTtl((prev) => {
        if (prev === null) return prev;
        if (prev <= 1) {
          setCodeExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [ttl]);

  async function consume() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/share/consume", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: props.token }),
      });

      if (res.status === 410) {
        setError("链接已失效（已被使用或已过期）");
        return;
      }

      const data = (await res.json()) as Partial<ConsumeOk> & { error?: string; details?: string };
      if (!res.ok) throw new Error(data.error ?? "consume_failed");

      const payload = data.payload;
      setCode(typeof payload?.code === "string" ? payload.code : null);
      setTtl(typeof payload?.ttl === "number" ? payload.ttl : null);
      setCodeExpired(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "consume_failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 space-y-4">
      {code === null && linkTtl !== null ? (
        <div className="rounded-2xl border border-border/70 bg-muted/30 p-3 text-xs text-muted-foreground">
          链接剩余有效期：
          <span className={`ml-1 font-medium ${linkTtl <= 10 ? "text-destructive" : "text-foreground"}`}>
            {linkTtl}s
          </span>
        </div>
      ) : null}

      <Button
        type="button"
        onClick={() => void consume()}
        disabled={busy || code !== null}
        className={busy ? "tv-pulse w-full" : "w-full"}
      >
        {code ? "已获取（一次性）" : busy ? "获取中…" : `获取「${props.initialLabel}」验证码（一次性）`}
      </Button>

      {error ? (
        <div className="rounded-2xl border border-destructive/70 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="rounded-2xl border border-border/70 bg-card/80 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Code</div>
          <Badge variant="outline">One-shot</Badge>
        </div>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div className="tv-code text-2xl sm:text-[1.8rem]">
            {code ? code : <span className="text-muted-foreground">—</span>}
          </div>
          {ttl !== null ? (
            <div className={`text-sm ${ttl <= 5 ? "text-destructive" : "text-muted-foreground"}`}>{ttl}s</div>
          ) : null}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          提示：此链接只能成功消费一次；刷新页面不会重复消费，但再次点击会失败。
        </p>
      </div>

      {codeExpired ? (
        <div className="rounded-2xl border border-border/70 bg-muted/28 p-3 text-xs text-muted-foreground">
          验证码已过期。一次性链接不会自动刷新验证码，请联系发送方重新生成分享链接。
        </div>
      ) : null}

      <div className="tv-panel-note">
        消费完成后，请尽快在目标服务中使用验证码。验证码本身仍遵循 TOTP 自身倒计时规则。
      </div>
    </div>
  );
}
