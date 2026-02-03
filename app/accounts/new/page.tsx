import { redirect } from "next/navigation";
import Link from "next/link";
import { readSessionFromCookies } from "@/lib/auth";
import { AccountForm } from "../AccountForm";

export const dynamic = "force-dynamic";

export default async function NewAccountPage() {
  const session = await readSessionFromCookies();
  if (!session) redirect("/login");

  return (
    <div className="tv-container max-w-xl py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">新增账户</h1>
        <Link href="/accounts" className="tv-link">
          返回
        </Link>
      </div>

      <div className="tv-card mt-6">
        <AccountForm
          mode="create"
          initial={{ label: "", issuer: "", digits: 6, period: 30, algorithm: "SHA1" }}
        />
      </div>
    </div>
  );
}
