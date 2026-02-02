import { NextResponse } from "next/server";
import { requireApiAuth, unauthorizedJson } from "@/lib/auth";
import { decryptSecret } from "@/lib/secret";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { base64urlToBytes } from "@/lib/base64url";
import { generateSteamGuardCode, generateTotp } from "@/lib/totp";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiAuth();
  } catch {
    return unauthorizedJson();
  }

  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("accounts")
    .select("encrypted_secret,digits,period,algorithm")
    .eq("id", id)
    .single();

  if (error || !data) {
    const status = error?.code === "PGRST116" ? 404 : 500;
    return NextResponse.json({ error: "db_error", details: error?.message ?? "not_found" }, { status });
  }

  let secret = "";
  try {
    secret = await decryptSecret(data.encrypted_secret);
  } catch {
    return NextResponse.json({ error: "decrypt_failed" }, { status: 500 });
  }

  const algorithm = (data.algorithm ?? "SHA1").toUpperCase();
  const period = data.period ?? 30;

  let code = "";
  let ttl = 0;
  if (algorithm === "STEAM") {
    let secretBytes: Uint8Array;
    try {
      secretBytes = base64urlToBytes(secret);
    } catch {
      return NextResponse.json({ error: "invalid_secret" }, { status: 500 });
    }
    ({ code, ttl } = await generateSteamGuardCode({ secretBytes, period }));
  } else if (algorithm === "SHA1") {
    ({ code, ttl } = await generateTotp({
      secret,
      digits: data.digits ?? 6,
      period,
    }));
  } else {
    return NextResponse.json({ error: "unsupported_algorithm" }, { status: 400 });
  }

  const res = NextResponse.json({ code, ttl });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
