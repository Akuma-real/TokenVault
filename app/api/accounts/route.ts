import { NextResponse } from "next/server";
import { requireApiAuth, unauthorizedJson } from "@/lib/auth";
import { normalizeBase32Secret, decodeBase32 } from "@/lib/base32";
import { encryptSecret } from "@/lib/secret";
import { base64urlToBytes, bytesToBase64url, normalizeToBase64url } from "@/lib/base64url";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { redirect303 } from "@/lib/http";

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

export async function GET() {
  try {
    await requireApiAuth();
  } catch {
    return unauthorizedJson();
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("accounts")
    .select("id,label,issuer,digits,period,algorithm,created_at,updated_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "db_error", details: error.message }, { status: 500 });
  }
  const res = NextResponse.json({ accounts: data ?? [] });
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function POST(req: Request) {
  try {
    await requireApiAuth();
  } catch {
    return unauthorizedJson();
  }

  const body = await readBody(req);
  const label = typeof body.label === "string" ? body.label.trim() : "";
  const issuer = typeof body.issuer === "string" ? body.issuer.trim() : null;
  const rawSecret = typeof body.secret === "string" ? body.secret : "";
  const digits = asOptionalInt(body.digits) ?? 6;
  const period = asOptionalInt(body.period) ?? 30;
  const algorithm = typeof body.algorithm === "string" ? body.algorithm.trim().toUpperCase() : "SHA1";

  if (!label) return NextResponse.json({ error: "label_required" }, { status: 400 });
  if (!rawSecret) return NextResponse.json({ error: "secret_required" }, { status: 400 });
  if (algorithm !== "SHA1" && algorithm !== "STEAM") {
    return NextResponse.json({ error: "unsupported_algorithm" }, { status: 400 });
  }

  let secretToStore = "";
  let digitsToStore = digits;
  let periodToStore = period;

  if (algorithm === "SHA1") {
    if (digits !== 6 && digits !== 8) return NextResponse.json({ error: "invalid_digits" }, { status: 400 });
    if (period < 5 || period > 120) return NextResponse.json({ error: "invalid_period" }, { status: 400 });
    const secret = normalizeBase32Secret(rawSecret);
    try {
      decodeBase32(secret);
    } catch (e) {
      return NextResponse.json(
        { error: "invalid_secret", details: e instanceof Error ? e.message : String(e) },
        { status: 400 },
      );
    }
    secretToStore = secret;
  } else {
    // Steam Guard: store secret as base64url of raw bytes (accept base64/base64url OR base32 input)
    digitsToStore = 5;
    periodToStore = 30;

    const compact = rawSecret.trim().replace(/\s+/g, "");
    const upper = compact.toUpperCase();
    const looksLikeBase32 = /^[A-Z2-7]+$/.test(upper) && upper.length % 8 === 0;

    let secretBytes: Uint8Array;
    try {
      if (looksLikeBase32) {
        const b32 = normalizeBase32Secret(compact);
        secretBytes = decodeBase32(b32);
      } else {
        const b64u = normalizeToBase64url(compact);
        secretBytes = base64urlToBytes(b64u);
      }
    } catch (e) {
      return NextResponse.json(
        { error: "invalid_secret", details: e instanceof Error ? e.message : String(e) },
        { status: 400 },
      );
    }

    if (secretBytes.length === 0) return NextResponse.json({ error: "invalid_secret" }, { status: 400 });
    secretToStore = bytesToBase64url(secretBytes);
  }

  const encrypted_secret = await encryptSecret(secretToStore);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("accounts")
    .insert({ label, issuer, encrypted_secret, digits: digitsToStore, period: periodToStore, algorithm })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: "db_error", details: error.message }, { status: 500 });
  }

  const accept = req.headers.get("accept") ?? "";
  const wantsHtml = accept.includes("text/html");
  const res = wantsHtml
    ? redirect303("/accounts")
    : NextResponse.json({ ok: true, id: data?.id ?? null });

  res.headers.set("Cache-Control", "no-store");
  return res;
}
