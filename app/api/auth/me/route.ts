import { NextResponse } from "next/server";
import { readSessionFromCookies } from "@/lib/auth";

export async function GET() {
  const session = await readSessionFromCookies();
  const res = NextResponse.json({ authenticated: !!session, exp: session?.exp ?? null });
  res.headers.set("Cache-Control", "no-store");
  return res;
}

