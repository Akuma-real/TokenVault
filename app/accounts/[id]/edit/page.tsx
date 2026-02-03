import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { readSessionFromCookies } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { AccountForm } from "../../AccountForm";

export const dynamic = "force-dynamic";

export default async function EditAccountPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await readSessionFromCookies();
  if (!session) redirect("/login");

  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("accounts")
    .select("id,label,issuer,digits,period,algorithm")
    .eq("id", id)
    .single();

  if (error || !data) notFound();

  return (
    <div className="tv-container max-w-xl py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">编辑账户</h1>
        <Link href="/accounts" className="tv-link">
          返回
        </Link>
      </div>

      <div className="tv-card mt-6">
        <AccountForm
          mode="edit"
          accountId={data.id}
          initial={{
            label: data.label ?? "",
            issuer: data.issuer ?? "",
            digits: data.digits ?? 6,
            period: data.period ?? 30,
            algorithm: (data.algorithm ?? "SHA1").toUpperCase() === "STEAM" ? "STEAM" : "SHA1",
          }}
        />
      </div>
    </div>
  );
}
