import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="tv-page max-w-2xl justify-center">
      <Card className="tv-card py-0">
        <CardContent className="p-6 sm:p-7">
          <p className="tv-kicker">404</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">页面不存在</h1>
          <p className="mt-3 text-sm text-muted-foreground">你访问的页面不存在或已被移动，建议回到首页重新进入。</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Card className="tv-card-compact py-0">
              <CardContent className="px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">状态</p>
                <p className="mt-2 text-sm font-semibold">Not Found</p>
              </CardContent>
            </Card>
            <Card className="tv-card-compact py-0">
              <CardContent className="px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">建议操作</p>
                <p className="mt-2 text-sm font-semibold">返回首页</p>
              </CardContent>
            </Card>
            <Card className="tv-card-compact py-0">
              <CardContent className="px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">入口</p>
                <p className="mt-2 text-sm font-semibold">/login</p>
              </CardContent>
            </Card>
          </div>
          <Button asChild className="mt-6 w-full">
            <Link href="/">返回首页</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
