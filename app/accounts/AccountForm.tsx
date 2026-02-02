"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

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
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="algorithm">
          类型
        </label>
        <select
          id="algorithm"
          value={algorithm}
          onChange={(e) => {
            const next = e.target.value as AccountFormInitial["algorithm"];
            setAlgorithm(next);
            if (next === "STEAM") {
              setDigits(5);
              setPeriod(30);
            } else {
              setDigits((d) => (d === 5 ? 6 : d));
              setPeriod((p) => (p === 30 ? 30 : p));
            }
          }}
          className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="SHA1">标准 TOTP（数字）</option>
          <option value="STEAM">Steam Guard（5 位字符）</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="label">
          名称（label）
        </label>
        <input
          id="label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          required
          className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="issuer">
          发行方（issuer，可选）
        </label>
        <input
          id="issuer"
          value={issuer}
          onChange={(e) => setIssuer(e.target.value)}
          className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="secret">
          Secret（{algorithm === "STEAM" ? "Base64 或 Base32" : "Base32"}
          {isCreate ? "，必填" : "，留空表示不修改"}）
        </label>
        <input
          id="secret"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          required={isCreate}
          className="h-10 w-full rounded-md border bg-background px-3 font-mono text-sm outline-none focus:ring-2 focus:ring-ring"
          placeholder={algorithm === "STEAM" ? "shared_secret（Base64）或 Base32" : "JBSWY3DPEHPK3PXP"}
        />
        <p className="text-xs text-muted-foreground">
          支持空格/短横线；会自动规范化并加密存库。
          {algorithm === "STEAM" ? "（Steam 会固定为 30s/5 位字符码）" : null}
        </p>
      </div>

      {algorithm === "STEAM" ? (
        <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
          Steam Guard 参数固定：`period=30s`，`code=5 位字符`。
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="digits">
              Digits
            </label>
            <select
              id="digits"
              value={String(digits)}
              onChange={(e) => setDigits(Number(e.target.value))}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="6">6</option>
              <option value="8">8</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="period">
              Period（秒）
            </label>
            <input
              id="period"
              type="number"
              min={5}
              max={120}
              value={period}
              onChange={(e) => setPeriod(Number(e.target.value))}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      )}

      {error ? <div className="rounded-md border border-destructive p-3 text-sm text-destructive">{error}</div> : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {busy ? "处理中…" : submitLabel}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => router.push("/accounts")}
          className="inline-flex h-10 items-center justify-center rounded-md border bg-background px-4 text-sm hover:bg-muted disabled:opacity-60"
        >
          取消
        </button>
      </div>
    </form>
  );
}
