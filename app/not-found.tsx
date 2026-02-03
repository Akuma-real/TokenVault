import Link from "next/link";

export default function NotFound() {
  return (
    <div className="tv-container flex min-h-[100svh] max-w-md flex-col justify-center py-12">
      <div className="tv-card">
        <h1 className="text-xl font-semibold">页面不存在</h1>
        <p className="mt-2 text-sm text-muted-foreground">你访问的页面不存在或已被移动。</p>
        <Link
          href="/"
          className="tv-btn tv-btn-primary mt-6 w-full"
        >
          返回首页
        </Link>
      </div>
    </div>
  );
}
