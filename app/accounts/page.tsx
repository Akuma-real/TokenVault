import { redirect } from "next/navigation";
import { readSessionFromCookies } from "@/lib/auth";
import { listAccountsForPage } from "@/lib/account-repo";
import { AccountsClient } from "./AccountsClient";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const session = await readSessionFromCookies();
  if (!session) redirect("/login");

  const { data: accounts, error } = await listAccountsForPage();

  return <AccountsClient accounts={accounts} errorMessage={error} />;
}
