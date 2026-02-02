import { redirect } from "next/navigation";
import { readSessionFromCookies } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await readSessionFromCookies();
  redirect(session ? "/accounts" : "/login");
}
