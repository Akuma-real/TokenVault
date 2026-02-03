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
    <div className="tv-container max-w-4xl py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">账户</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            默认不展示 code；开启后仅对可见行自动取码与刷新。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:justify-end">
          <button
            type="button"
            onClick={() => setCodesEnabled((v) => !v)}
            className="tv-btn tv-btn-outline"
          >
            {toggleLabel}
          </button>
          <Link
            href="/accounts/new"
            className="tv-btn tv-btn-primary"
          >
            新增
          </Link>
          <form method="post" action="/api/auth/logout">
            <button
              type="submit"
              className="tv-btn tv-btn-outline"
            >
              退出
            </button>
          </form>
        </div>
      </div>

      <div className="tv-table-wrap mt-8">
        <table className="w-full table-fixed">
          <thead className="tv-thead">
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
