import { NextResponse } from "next/server";
import { requireApiAuth, unauthorizedJson } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { randomToken, sha256Hex } from "@/lib/crypto";

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

function asOptionalInt(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return Math.floor(value);
  if (typeof value === "string" && value.trim().length > 0) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.floor(n) : undefined;
  }
  return undefined;
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

  const ttlSeconds = asOptionalInt(body.ttlSeconds) ?? 300;
  if (ttlSeconds < 30 || ttlSeconds > 3600) {
    return NextResponse.json({ error: "invalid_ttlSeconds" }, { status: 400 });
  }

  const token = randomToken("tvs_");
  const token_hash = await sha256Hex(token);
  const expires_at = new Date(Date.now() + ttlSeconds * 1000).toISOString();

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("share_tokens")
    .insert({ account_id: accountId, token_hash, expires_at })
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
  });
  res.headers.set("Cache-Control", "no-store");
  return res;
}

