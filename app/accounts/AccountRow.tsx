"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type Account = {
  id: string;
  label: string;
  issuer: string | null;
  digits: number;
  period: number;
  algorithm: string;
};

export function AccountRow({ account, codesEnabled }: { account: Account; codesEnabled: boolean }) {
  const router = useRouter();
  const [code, setCode] = useState<string | null>(null);
  const [ttl, setTtl] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareTtlSeconds, setShareTtlSeconds] = useState<number>(300);
  const inFlightRef = useRef(false);
  const rowRef = useRef<HTMLTableRowElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const subtitle = useMemo(() => {
    const algorithm = (account.algorithm ?? "SHA1").toUpperCase();
    const parts = [];
    if (account.issuer) parts.push(account.issuer);
    if (algorithm === "STEAM") {
      parts.push("Steam · 5位字符 / 30s");
    } else {
      parts.push(`${account.digits}位 / ${account.period}s`);
    }
    return parts.join(" · ");
  }, [account.algorithm, account.digits, account.issuer, account.period]);

  async function createShareLink() {
    setShareBusy(true);
    setShareUrl(null);
    setShareError(null);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accountId: account.id, ttlSeconds: shareTtlSeconds }),
      });
      const data = (await res.json()) as { url?: string; error?: string; details?: string };
      if (!res.ok) throw new Error(data.error ?? "share_failed");
      const url = typeof data.url === "string" ? data.url : "";
      if (!url) throw new Error("share_failed");
      const absolute = `${window.location.origin}${url}`;
      setShareUrl(absolute);
      try {
        await navigator.clipboard.writeText(absolute);
      } catch {
        // ignore
      }
    } catch (e) {
      setShareError(e instanceof Error ? e.message : "share_failed");
    } finally {
      setShareBusy(false);
    }
  }

  async function refreshCode() {
    if (inFlightRef.current) return;
    if (!codesEnabled || !isVisible) return;
    inFlightRef.current = true;
    setBusy(true);
    try {
      const res = await fetch(`/api/totp/${account.id}`, { cache: "no-store" });
      const data = (await res.json()) as { code?: string; ttl?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? "fetch_failed");
      setCode(data.code ?? null);
      setTtl(typeof data.ttl === "number" ? data.ttl : null);
    } finally {
      setBusy(false);
      inFlightRef.current = false;
    }
  }

  useEffect(() => {
    if (!codesEnabled || !isVisible || !code || ttl === null) return;
    const timer = window.setInterval(() => {
      setTtl((prev) => {
        if (prev === null) return prev;
        if (prev <= 1) {
          if (document.visibilityState === "visible") void refreshCode();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, codesEnabled, isVisible]);

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        setIsVisible(entry.isIntersecting);
      },
      { root: null, rootMargin: "200px", threshold: 0.01 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!codesEnabled) {
      setCode(null);
      setTtl(null);
      return;
    }
    if (codesEnabled && isVisible && !code) {
      void refreshCode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codesEnabled, isVisible]);

  async function deleteAccount() {
    if (!confirm(`确认删除「${account.label}」？此操作会删除数据库记录。`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/accounts/${account.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "delete_failed");
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr ref={rowRef} className="border-b transition-colors hover:bg-muted/15 last:border-b-0">
      <td className="p-3 align-top">
        <div className="font-medium">{account.label}</div>
        <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div>
        {shareUrl ? (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <a href={shareUrl} target="_blank" rel="noreferrer" className="tv-link">
              分享链接（一次性）
            </a>
            <button
              type="button"
              className="tv-btn-sm tv-btn-outline"
              onClick={() => void navigator.clipboard.writeText(shareUrl).catch(() => {})}
            >
              复制
            </button>
          </div>
        ) : null}
        {shareError ? <div className="mt-2 text-xs text-destructive">分享失败：{shareError}</div> : null}
      </td>
      <td className="p-3 align-top">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refreshCode}
            disabled={busy || !codesEnabled || !isVisible}
            className="tv-btn-sm tv-btn-outline"
          >
            取码
          </button>
          <div className="min-w-[8rem] font-mono text-sm">
            {codesEnabled ? (code ? code : <span className="text-muted-foreground">—</span>) : "•••••"}
            {codesEnabled && ttl !== null ? (
              <span className="ml-2 text-xs text-muted-foreground">{ttl}s</span>
            ) : null}
          </div>
        </div>
      </td>
      <td className="p-3 align-top text-right">
        <div className="flex justify-end gap-2">
          <select
            value={shareTtlSeconds}
            onChange={(e) => setShareTtlSeconds(Number(e.target.value))}
            className="tv-select h-9 w-[7.5rem]"
            disabled={busy || shareBusy}
            aria-label="分享有效期"
          >
            <option value={30}>30s</option>
            <option value={60}>60s</option>
            <option value={300}>300s</option>
            <option value={600}>600s</option>
            <option value={1800}>1800s</option>
            <option value={3600}>3600s</option>
          </select>
          <button
            type="button"
            onClick={createShareLink}
            disabled={busy || shareBusy}
            className="tv-btn-sm tv-btn-outline"
          >
            {shareBusy ? "生成中…" : "分享"}
          </button>
          <Link
            href={`/accounts/${account.id}/edit`}
            className="tv-btn-sm tv-btn-outline"
          >
            编辑
          </Link>
          <button
            type="button"
            onClick={deleteAccount}
            disabled={busy}
            className="tv-btn-sm tv-btn-destructive"
          >
            删除
          </button>
        </div>
      </td>
    </tr>
  );
}
