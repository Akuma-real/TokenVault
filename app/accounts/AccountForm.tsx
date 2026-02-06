"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type AccountFormInitial = {
  label: string;
  issuer: string;
  digits: number;
  period: number;
  algorithm: "SHA1" | "STEAM";
};

export function AccountForm(props: {
  mode: "create" | "edit";
  accountId?: string;
  initial: AccountFormInitial;
}) {
  const router = useRouter();
  const [label, setLabel] = useState(props.initial.label);
  const [issuer, setIssuer] = useState(props.initial.issuer);
  const [secret, setSecret] = useState("");
  const [algorithm, setAlgorithm] = useState<AccountFormInitial["algorithm"]>(props.initial.algorithm);
  const [digits, setDigits] = useState(props.initial.digits);
  const [period, setPeriod] = useState(props.initial.period);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCreate = props.mode === "create";
  const submitLabel = useMemo(() => (isCreate ? "创建" : "保存"), [isCreate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (!isCreate && algorithm !== props.initial.algorithm && secret.trim().length === 0) {
        throw new Error("切换类型时必须填写 Secret");
      }
      const payload: Record<string, unknown> = {
        label,
        issuer,
        digits,
        period,
        algorithm,
      };
      if (isCreate) payload.secret = secret;
      if (!isCreate && secret.trim().length > 0) payload.secret = secret;

      const url = isCreate ? "/api/accounts" : `/api/accounts/${props.accountId}`;
      const method = isCreate ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string; details?: string };
      if (!res.ok) throw new Error(data.details ? `${data.error}: ${data.details}` : (data.error ?? "request_failed"));
      router.push("/accounts");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{isCreate ? "Create" : "Edit"}</Badge>
        <Badge variant="outline">{algorithm === "STEAM" ? "Steam Guard" : "Standard TOTP"}</Badge>
        <Badge variant="outline">{isCreate ? "初始化" : "参数更新"}</Badge>
      </div>

      <div className="rounded-2xl border border-border/65 bg-muted/20 p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">核心参数</p>
        <div className="mt-3 space-y-2">
          <Label htmlFor="algorithm">类型</Label>
          <Select
            value={algorithm}
            onValueChange={(value) => {
              const next = value as AccountFormInitial["algorithm"];
              setAlgorithm(next);
              if (next === "STEAM") {
                setDigits(5);
                setPeriod(30);
              } else {
                setDigits((prevDigits) => (prevDigits === 5 ? 6 : prevDigits));
                setPeriod((prevPeriod) => (prevPeriod === 30 ? 30 : prevPeriod));
              }
            }}
          >
            <SelectTrigger id="algorithm">
              <SelectValue placeholder="选择类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SHA1">标准 TOTP（数字）</SelectItem>
              <SelectItem value="STEAM">Steam Guard（5 位字符）</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="label">名称（label）</Label>
          <Input
            id="label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
            placeholder="例如：GitHub / Google"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="issuer">发行方（issuer，可选）</Label>
          <Input
            id="issuer"
            value={issuer}
            onChange={(e) => setIssuer(e.target.value)}
            placeholder="例如：GitHub"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-border/65 bg-card/70 p-4 sm:p-5">
        <div className="space-y-2">
          <Label htmlFor="secret">
            Secret（{algorithm === "STEAM" ? "Base64 或 Base32" : "Base32"}
            {isCreate ? "，必填" : "，留空表示不修改"}）
          </Label>
          <Input
            id="secret"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            required={isCreate}
            className="font-mono tracking-wide"
            placeholder={algorithm === "STEAM" ? "shared_secret（Base64）或 Base32" : "JBSWY3DPEHPK3PXP"}
          />
          <p className="text-xs leading-relaxed text-muted-foreground">
            支持空格/短横线，提交后会自动规范化并加密存库。
            {algorithm === "STEAM" ? " Steam 模式固定为 30 秒周期和 5 位字符码。" : null}
          </p>
        </div>
      </div>

      {algorithm === "STEAM" ? (
        <div className="tv-panel-note">
          Steam Guard 参数固定：`period=30s`，`code=5 位字符`。
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 rounded-2xl border border-border/60 bg-muted/16 p-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="digits">Digits</Label>
            <Select value={String(digits)} onValueChange={(value) => setDigits(Number(value))}>
              <SelectTrigger id="digits">
                <SelectValue placeholder="选择位数" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">6</SelectItem>
                <SelectItem value="8">8</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="period">Period（秒）</Label>
            <Input
              id="period"
              type="number"
              min={5}
              max={120}
              value={period}
              onChange={(e) => setPeriod(Number(e.target.value))}
            />
          </div>
        </div>
      )}

      {error ? <div className="rounded-2xl border border-destructive/70 bg-destructive/10 p-3 text-sm text-destructive">{error}</div> : null}

      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" disabled={busy}>
          {busy ? "处理中…" : submitLabel}
        </Button>
        <Button type="button" disabled={busy} onClick={() => router.push("/accounts")} variant="outline">
          取消
        </Button>
      </div>
    </form>
  );
}
