"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TableCell, TableRow } from "@/components/ui/table";

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
  const [codeError, setCodeError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareDialogError, setShareDialogError] = useState<string | null>(null);
  const [shareTtlDraftInput, setShareTtlDraftInput] = useState<string>("300");
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
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

  const algorithmLabel = useMemo(() => {
    const normalized = (account.algorithm ?? "SHA1").toUpperCase();
    return normalized === "STEAM" ? "Steam Guard" : normalized;
  }, [account.algorithm]);

  const ttlTone = ttl !== null && ttl <= 5 ? "text-destructive" : "text-muted-foreground";
  const sharePresetOptions = [30, 60, 300, 600, 1800, 3600];

  function mapTtlLabel(seconds: number): string {
    if (seconds >= 3600) return "1 小时";
    if (seconds >= 1800) return "30 分钟";
    if (seconds >= 600) return "10 分钟";
    if (seconds >= 300) return "5 分钟";
    if (seconds >= 60) return "1 分钟";
    return "30 秒";
  }

  function onShareTtlDraftChange(raw: string) {
    setShareTtlDraftInput(raw);
    setShareDialogError(null);
  }

  async function copyShareUrl() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1300);
      toast.success("链接已复制");
    } catch {
      setCopied(false);
      toast.error("复制失败，请手动复制");
    }
  }

  function openShareDialog() {
    setShareDialogOpen(true);
    setShareDialogError(null);
    setShareTtlDraftInput(String(shareTtlSeconds));
  }

  function parseShareTtlInput(): number | null {
    const parsedTtl = Number(shareTtlDraftInput);
    if (!Number.isInteger(parsedTtl)) return null;
    if (parsedTtl < 30 || parsedTtl > 3600) return null;
    return parsedTtl;
  }

  async function createShareLink(ttlSeconds: number): Promise<boolean> {
    setShareBusy(true);
    setShareDialogError(null);
    setCopied(false);

    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accountId: account.id, ttlSeconds }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "share_failed");

      const url = typeof data.url === "string" ? data.url : "";
      if (!url) throw new Error("share_failed");

      const absolute = `${window.location.origin}${url}`;
      setShareUrl(absolute);
      setShareTtlSeconds(ttlSeconds);

      let copiedOnCreate = false;
      try {
        await navigator.clipboard.writeText(absolute);
        copiedOnCreate = true;
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1300);
      } catch {
        setCopied(false);
      }

      toast.success(copiedOnCreate ? "分享链接已生成并复制" : "分享链接已生成，请手动复制");
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "share_failed";
      setShareDialogError(message);
      toast.error("分享生成失败");
      return false;
    } finally {
      setShareBusy(false);
    }
  }

  async function submitShareFromDialog() {
    const parsedTtl = parseShareTtlInput();
    if (parsedTtl === null) {
      setShareDialogError("有效期必须为 30~3600 之间的整数秒");
      return;
    }
    await createShareLink(parsedTtl);
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
      setCodeError(null);
    } catch (error) {
      setCodeError(error instanceof Error ? error.message : "fetch_failed");
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
      setCodeError(null);
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
    <TableRow
      ref={rowRef}
      className="tv-row-hover border-b border-border/55 align-top transition-colors duration-200 last:border-b-0"
    >
      <TableCell className="p-4 align-top">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="font-semibold tracking-tight text-foreground">{account.label}</div>
          <Badge variant="outline">{algorithmLabel}</Badge>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">{subtitle}</div>
      </TableCell>

      <TableCell className="p-4 align-top">
        <div className="rounded-xl border border-border/70 bg-card/78 px-3 py-2.5">
          <div className="tv-code min-w-[8rem] text-sm sm:text-base">
            {codesEnabled ? (code ? code : <span className="text-muted-foreground">—</span>) : "•••••"}
          </div>
          {codesEnabled && ttl !== null ? <span className={`text-xs ${ttlTone}`}>{ttl}s</span> : null}
        </div>

        {codesEnabled && codeError ? (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-destructive">取码失败</span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={() => void refreshCode()}
              disabled={busy || !isVisible}
            >
              {busy ? "重试中…" : "重试"}
            </Button>
          </div>
        ) : null}

        <div className="sr-only" aria-live="polite">
          {codeError ? `取码失败：${codeError}` : ""}
        </div>
      </TableCell>

      <TableCell className="p-4 text-right align-top">
        <div className="flex flex-wrap justify-end gap-2">
          <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
            <DialogTrigger asChild>
              <Button type="button" size="sm" variant="outline" onClick={openShareDialog} disabled={busy || shareBusy}>
                分享
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>生成一次性分享链接</DialogTitle>
                <DialogDescription>选择链接有效期（30~3600 秒）。链接仍将严格一次性消费。</DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <Label>预设有效期</Label>
                <div className="grid grid-cols-3 gap-2">
                  {sharePresetOptions.map((seconds) => {
                    const active = Number(shareTtlDraftInput) === seconds;
                    return (
                      <Button
                        key={seconds}
                        type="button"
                        variant={active ? "default" : "outline"}
                        size="sm"
                        onClick={() => onShareTtlDraftChange(String(seconds))}
                      >
                        {seconds}s
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`share-ttl-${account.id}`}>自定义有效期（秒）</Label>
                <Input
                  id={`share-ttl-${account.id}`}
                  type="number"
                  min={30}
                  max={3600}
                  value={shareTtlDraftInput}
                  onChange={(e) => onShareTtlDraftChange(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">建议 30s~3600s，默认 300s。</p>
              </div>

              {shareUrl ? (
                <div className="rounded-xl border border-border/65 bg-muted/24 p-3 text-left">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">已生成分享链接</span>
                    <Badge variant="outline">{mapTtlLabel(shareTtlSeconds)}</Badge>
                  </div>
                  <a
                    href={shareUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="tv-link mt-2 block break-all text-sm"
                  >
                    {shareUrl}
                  </a>
                  <div className="mt-2 flex justify-end">
                    <Button type="button" size="sm" variant={copied ? "default" : "outline"} onClick={() => void copyShareUrl()}>
                      {copied ? "已复制" : "复制链接"}
                    </Button>
                  </div>
                </div>
              ) : null}

              {shareDialogError ? <div className="text-sm text-destructive">分享失败：{shareDialogError}</div> : null}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShareDialogOpen(false)}>
                  关闭
                </Button>
                <Button type="button" onClick={() => void submitShareFromDialog()} disabled={shareBusy}>
                  {shareBusy ? "生成中…" : shareUrl ? "重新生成" : "确认生成"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button asChild size="sm" variant="outline">
            <Link href={`/accounts/${account.id}/edit`}>编辑</Link>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={() => void deleteAccount()}
            disabled={busy}
          >
            删除
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
