"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  const accountCount = props.accounts.length;
  const standardCount = useMemo(
    () => props.accounts.filter((account) => account.algorithm.toUpperCase() !== "STEAM").length,
    [props.accounts],
  );
  const steamCount = useMemo(
    () => props.accounts.filter((account) => account.algorithm.toUpperCase() === "STEAM").length,
    [props.accounts],
  );

  return (
    <div className="tv-page max-w-6xl gap-7">
      <header className="tv-card grid gap-7 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="tv-kicker">Vault Console</p>
          <h1 className="tv-title mt-3">账户总览</h1>
          <p className="tv-subtitle">
            默认隐藏验证码；启用后仅对可见行自动取码和刷新，避免不必要的 API 消耗。
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <Badge variant="outline">账户数 {accountCount}</Badge>
            <Badge variant="outline">分享默认 300s</Badge>
            <Badge variant="outline">严格一次性消费</Badge>
            <Badge variant="outline">标准 TOTP {standardCount}</Badge>
            <Badge variant="outline">Steam Guard {steamCount}</Badge>
            <Badge variant="outline">状态 {codesEnabled ? "已显示" : "已隐藏"}</Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 lg:justify-end">
          <Button
            type="button"
            onClick={() => setCodesEnabled((value) => !value)}
            className={codesEnabled ? "tv-pulse" : ""}
            variant={codesEnabled ? "default" : "outline"}
          >
            {toggleLabel}验证码
          </Button>
          <Button asChild>
            <Link href="/accounts/new">新增账户</Link>
          </Button>
          <form method="post" action="/api/auth/logout">
            <Button type="submit" variant="outline">
              退出登录
            </Button>
          </form>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="tv-card-compact py-0">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">总账户</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{accountCount}</p>
          </CardContent>
        </Card>
        <Card className="tv-card-compact py-0">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">可见取码</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{codesEnabled ? "ON" : "OFF"}</p>
          </CardContent>
        </Card>
        <Card className="tv-card-compact py-0">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">分享区间</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">30s~3600s</p>
          </CardContent>
        </Card>
      </div>

      <div className="tv-table-wrap p-1">
        <Table className="table-fixed">
          <TableHeader className="tv-thead">
            <TableRow>
              <TableHead className="p-3.5 font-medium">账户</TableHead>
              <TableHead className="p-3.5 font-medium">TOTP</TableHead>
              <TableHead className="p-3.5 text-right font-medium">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {props.errorMessage ? (
              <TableRow>
                <TableCell colSpan={3} className="p-7 text-sm text-destructive">
                  加载失败：{props.errorMessage}
                </TableCell>
              </TableRow>
            ) : props.accounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="p-9 text-sm text-muted-foreground">
                  还没有账户。点击右上角「新增」。
                </TableCell>
              </TableRow>
            ) : (
              props.accounts.map((account) => (
                <AccountRow key={account.id} account={account} codesEnabled={codesEnabled} />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
