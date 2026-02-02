import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

export async function POST(req: Request) {
  const accept = req.headers.get("accept") ?? "";
  const wantsHtml = accept.includes("text/html");
  const res = wantsHtml
    ? NextResponse.redirect("/login", { status: 303 })
    : NextResponse.json({ ok: true });

  clearSessionCookie(res);
  res.headers.set("Cache-Control", "no-store");
  return res;
}
