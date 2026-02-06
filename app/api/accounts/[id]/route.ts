import { NextResponse } from "next/server";
import { requireApiAuth, unauthorizedJson } from "@/lib/auth";
import { decodeBase32, normalizeBase32Secret } from "@/lib/base32";
import { encryptSecret } from "@/lib/secret";
import { base64urlToBytes, bytesToBase64url, normalizeToBase64url } from "@/lib/base64url";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { redirect303 } from "@/lib/http";
import { asOptionalInt, readRequestBody } from "@/lib/request";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  try {
    await requireApiAuth(req);
  } catch {
    return unauthorizedJson();
  }

  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("accounts")
    .select("id,label,issuer,digits,period,algorithm,created_at,updated_at")
    .eq("id", id)
    .single();

  if (error) {
    const status = error.code === "PGRST116" ? 404 : 500;
    return NextResponse.json({ error: "db_error", details: error.message }, { status });
  }

  const res = NextResponse.json({ account: data });
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    await requireApiAuth(req);
  } catch {
    return unauthorizedJson();
  }

  const { id } = await params;
  const body = await readRequestBody(req);

  const supabase = getSupabaseAdmin();
  const { data: existing, error: existingError } = await supabase
    .from("accounts")
    .select("algorithm")
    .eq("id", id)
    .single();

  if (existingError || !existing) {
    const status = existingError?.code === "PGRST116" ? 404 : 500;
    return NextResponse.json({ error: "db_error", details: existingError?.message ?? "not_found" }, { status });
  }

  const currentAlgorithm = (existing.algorithm ?? "SHA1").toUpperCase();

  const patch: Record<string, unknown> = {};
  if (typeof body.label === "string") patch.label = body.label.trim();
  if (typeof body.issuer === "string") patch.issuer = body.issuer.trim() || null;

  const requestedAlgorithm =
    typeof body.algorithm === "string" ? body.algorithm.trim().toUpperCase() : undefined;
  if (requestedAlgorithm !== undefined && requestedAlgorithm !== "SHA1" && requestedAlgorithm !== "STEAM") {
    return NextResponse.json({ error: "unsupported_algorithm" }, { status: 400 });
  }

  const rawSecret = typeof body.secret === "string" ? body.secret : undefined;

  if (
    requestedAlgorithm !== undefined &&
    requestedAlgorithm !== currentAlgorithm &&
    (!rawSecret || rawSecret.trim().length === 0)
  ) {
    return NextResponse.json({ error: "secret_required_for_algorithm_change" }, { status: 400 });
  }

  const nextAlgorithm = (requestedAlgorithm ?? currentAlgorithm).toUpperCase();

  const requestedDigits = asOptionalInt(body.digits);
  const requestedPeriod = asOptionalInt(body.period);

  if (nextAlgorithm === "STEAM") {
    if (requestedDigits !== undefined && requestedDigits !== 5) {
      return NextResponse.json({ error: "invalid_digits_for_steam" }, { status: 400 });
    }
    if (requestedPeriod !== undefined && requestedPeriod !== 30) {
      return NextResponse.json({ error: "invalid_period_for_steam" }, { status: 400 });
    }
    if (requestedAlgorithm === "STEAM") {
      patch.algorithm = "STEAM";
      patch.digits = 5;
      patch.period = 30;
    }
  } else {
    if (requestedDigits !== undefined) {
      if (requestedDigits !== 6 && requestedDigits !== 8) {
        return NextResponse.json({ error: "invalid_digits" }, { status: 400 });
      }
      patch.digits = requestedDigits;
    }
    if (requestedPeriod !== undefined) {
      if (requestedPeriod < 5 || requestedPeriod > 120) {
        return NextResponse.json({ error: "invalid_period" }, { status: 400 });
      }
      patch.period = requestedPeriod;
    }
    if (requestedAlgorithm === "SHA1") patch.algorithm = "SHA1";
  }

  if (rawSecret !== undefined && rawSecret.trim().length > 0) {
    if (nextAlgorithm === "STEAM") {
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
      patch.encrypted_secret = await encryptSecret(bytesToBase64url(secretBytes));
      patch.algorithm = "STEAM";
      patch.digits = 5;
      patch.period = 30;
    } else {
      const normalized = normalizeBase32Secret(rawSecret);
      try {
        decodeBase32(normalized);
      } catch (e) {
        return NextResponse.json(
          { error: "invalid_secret", details: e instanceof Error ? e.message : String(e) },
          { status: 400 },
        );
      }
      patch.encrypted_secret = await encryptSecret(normalized);
      if (requestedAlgorithm === "SHA1") patch.algorithm = "SHA1";
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "empty_patch" }, { status: 400 });
  }

  const { error } = await supabase.from("accounts").update(patch).eq("id", id);
  if (error) {
    return NextResponse.json({ error: "db_error", details: error.message }, { status: 500 });
  }

  const accept = req.headers.get("accept") ?? "";
  const wantsHtml = accept.includes("text/html");
  const res = wantsHtml
    ? redirect303("/accounts")
    : NextResponse.json({ ok: true });

  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function DELETE(req: Request, { params }: Params) {
  try {
    await requireApiAuth(req);
  } catch {
    return unauthorizedJson();
  }

  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("accounts").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: "db_error", details: error.message }, { status: 500 });
  }

  const accept = req.headers.get("accept") ?? "";
  const wantsHtml = accept.includes("text/html");
  const res = wantsHtml
    ? redirect303("/accounts")
    : NextResponse.json({ ok: true });

  res.headers.set("Cache-Control", "no-store");
  return res;
}
