import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold">页面不存在</h1>
        <p className="mt-2 text-sm text-muted-foreground">你访问的页面不存在或已被移动。</p>
        <Link
          href="/"
          className="mt-6 inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          返回首页
        </Link>
      </div>
    </div>
  );
}

