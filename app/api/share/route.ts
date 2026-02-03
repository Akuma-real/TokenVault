import { NextResponse } from "next/server";
import { requireApiAuth, unauthorizedJson } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { randomToken, sha256Hex } from "@/lib/crypto";
import { encryptSharePayload, parseTtlSeconds } from "@/lib/share";

async function readBody(req: Request): Promise<Record<string, unknown>> {
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      return (await req.json()) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  try {
    const form = await req.formData();
    const out: Record<string, unknown> = {};
    for (const [k, v] of form.entries()) out[k] = v;
    return out;
  } catch {
    return {};
  }
}

export async function POST(req: Request) {
  let auth;
  try {
    auth = await requireApiAuth(req);
  } catch {
    return unauthorizedJson();
  }

  if (auth.kind !== "session") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await readBody(req);
  const accountId = typeof body.accountId === "string" ? body.accountId.trim() : "";
  if (!accountId) return NextResponse.json({ error: "accountId_required" }, { status: 400 });

  const ttlSeconds = parseTtlSeconds(body.ttlSeconds);

  const token = randomToken("tvs_");
  const token_hash = await sha256Hex(token);
  const expires_at = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  const payload_ciphertext = await encryptSharePayload({ v: 1, accountId });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("share_tokens")
    .insert({ account_id: accountId, token_hash, expires_at, payload_ciphertext })
    .select("id,expires_at,created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: "db_error", details: error.message }, { status: 500 });
  }

  const res = NextResponse.json({
    id: data?.id ?? null,
    url: `/s/${token}`,
    expiresAt: data?.expires_at ?? expires_at,
    token,
    ttlSeconds,
  });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
