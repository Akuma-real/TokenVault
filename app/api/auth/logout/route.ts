import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";
import { redirect303 } from "@/lib/http";

export async function POST(req: Request) {
  const accept = req.headers.get("accept") ?? "";
  const wantsHtml = accept.includes("text/html");
  const res = wantsHtml
    ? redirect303("/login")
    : NextResponse.json({ ok: true });

  clearSessionCookie(res);
  res.headers.set("Cache-Control", "no-store");
  return res;
}
