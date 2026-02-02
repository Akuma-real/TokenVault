"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AccountRow } from "./AccountRow";

type Account = {
  id: string;
  label: string;
  issuer: string | null;
  digits: number;
  period: number;
  algorithm: string;
};

export function AccountsClient(props: { accounts: Account[]; errorMessage: string | null }) {
  const [codesEnabled, setCodesEnabled] = useState(false);
  const toggleLabel = useMemo(() => (codesEnabled ? "隐藏全部" : "显示全部"), [codesEnabled]);

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">账户</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            默认不展示 code；开启后仅对可见行自动取码与刷新。
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setCodesEnabled((v) => !v)}
            className="inline-flex h-10 items-center justify-center rounded-md border bg-background px-4 text-sm hover:bg-muted"
          >
            {toggleLabel}
          </button>
          <Link
            href="/accounts/new"
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            新增
          </Link>
          <form method="post" action="/api/auth/logout">
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-md border bg-background px-4 text-sm hover:bg-muted"
            >
              退出
            </button>
          </form>
        </div>
      </div>

      <div className="mt-8 overflow-hidden rounded-xl border">
        <table className="w-full table-fixed">
          <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-3 font-medium">账户</th>
              <th className="p-3 font-medium">TOTP</th>
              <th className="p-3 font-medium text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {props.errorMessage ? (
              <tr>
                <td colSpan={3} className="p-6 text-sm text-destructive">
                  加载失败：{props.errorMessage}
                </td>
              </tr>
            ) : props.accounts.length === 0 ? (
              <tr>
                <td colSpan={3} className="p-6 text-sm text-muted-foreground">
                  还没有账户。点击右上角「新增」。
                </td>
              </tr>
            ) : (
              props.accounts.map((a) => (
                <AccountRow key={a.id} account={a} codesEnabled={codesEnabled} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

