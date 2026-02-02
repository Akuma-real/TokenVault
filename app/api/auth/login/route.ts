import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { setSessionCookie } from "@/lib/auth";
import { utf8ToBytes } from "@/lib/base64url";
import { redirect303 } from "@/lib/http";

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function readPassword(req: Request): Promise<string | null> {
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      const body = (await req.json()) as { password?: unknown };
      return typeof body.password === "string" ? body.password : null;
    } catch {
      return null;
    }
  }
  try {
    const form = await req.formData();
    const raw = form.get("password");
    return typeof raw === "string" ? raw : null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const password = await readPassword(req);
  const accept = req.headers.get("accept") ?? "";
  const wantsHtml = accept.includes("text/html");
  const ok =
    typeof password === "string" &&
    constantTimeEqual(utf8ToBytes(password), utf8ToBytes(env.ADMIN_PASSWORD));

  if (!ok) {
    return wantsHtml
      ? redirect303("/login?e=1")
      : NextResponse.json({ error: "invalid_password" }, { status: 401 });
  }

  const res = wantsHtml
    ? redirect303("/accounts")
    : NextResponse.json({ ok: true });

  await setSessionCookie(res);
  res.headers.set("Cache-Control", "no-store");
  return res;
}
