"use client";

import { useEffect, useRef, useState } from "react";

type ConsumeOk = {
  account: { id: string; label: string; issuer: string | null };
  code: string;
  ttl: number;
};

export function ConsumeClient(props: { token: string; initialLabel: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [ttl, setTtl] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    if (ttl === null) return;
    timerRef.current = window.setInterval(() => {
      setTtl((prev) => {
        if (prev === null) return prev;
        return prev <= 1 ? 0 : prev - 1;
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

      setCode(typeof data.code === "string" ? data.code : null);
      setTtl(typeof data.ttl === "number" ? data.ttl : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "consume_failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 space-y-4">
      <button
        type="button"
        onClick={consume}
        disabled={busy || code !== null}
        className="tv-btn tv-btn-primary w-full"
      >
        {code ? "已获取（一次性）" : busy ? "获取中…" : `获取「${props.initialLabel}」验证码（一次性）`}
      </button>

      {error ? (
        <div className="rounded-xl border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="rounded-2xl border bg-card p-4">
        <div className="text-xs text-muted-foreground">Code</div>
        <div className="mt-2 flex items-end justify-between gap-3">
          <div className="font-mono text-2xl tracking-widest">
            {code ? code : <span className="text-muted-foreground">—</span>}
          </div>
          {ttl !== null ? <div className="text-sm text-muted-foreground">{ttl}s</div> : null}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          提示：此链接只能成功消费一次；刷新页面不会重复消费，但再次点击会失败。
        </p>
      </div>
    </div>
  );
}

