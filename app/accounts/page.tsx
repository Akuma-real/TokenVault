import { redirect } from "next/navigation";
import { readSessionFromCookies } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { AccountsClient } from "./AccountsClient";

export const dynamic = "force-dynamic";

type Account = {
  id: string;
  label: string;
  issuer: string | null;
  digits: number;
  period: number;
  algorithm: string;
};

export default async function AccountsPage() {
  const session = await readSessionFromCookies();
  if (!session) redirect("/login");

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("accounts")
    .select("id,label,issuer,digits,period,algorithm")
    .order("created_at", { ascending: false });

  const accounts = (data ?? []) as Account[];

  return <AccountsClient accounts={accounts} errorMessage={error?.message ?? null} />;
}
