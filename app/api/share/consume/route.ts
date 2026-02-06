import { NextResponse } from "next/server";
import { decryptSecret } from "@/lib/secret";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { base64urlToBytes } from "@/lib/base64url";
import { generateSteamGuardCode, generateTotp } from "@/lib/totp";
import { sha256Hex } from "@/lib/crypto";
import { decryptSharePayload } from "@/lib/share";
import { readRequestBody } from "@/lib/request";

function noStore(res: NextResponse): NextResponse {
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function POST(req: Request) {
  const body = await readRequestBody(req);
  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token) return noStore(NextResponse.json({ error: "token_required" }, { status: 400 }));

  const supabase = getSupabaseAdmin();
  const tokenHash = await sha256Hex(token);
  const forwardedFor = req.headers.get("x-forwarded-for");
  const ip = forwardedFor ? forwardedFor.split(",")[0]?.trim() ?? null : null;
  const userAgent = req.headers.get("user-agent");

  const { data: peekRows, error: peekError } = await supabase.rpc("peek_share_token_with_account", {
    p_token_hash: tokenHash,
  });

  if (peekError) {
    return noStore(NextResponse.json({ error: "db_error", details: peekError.message }, { status: 500 }));
  }

  const peek =
    Array.isArray(peekRows) && peekRows.length > 0
      ? (peekRows[0] as {
          account_id?: string;
          payload_ciphertext?: string;
          is_valid?: boolean;
          label?: string;
          issuer?: string | null;
          encrypted_secret?: string;
          digits?: number;
          period?: number;
          algorithm?: string;
        })
      : null;

  const accountId = peek?.account_id ?? null;
  if (!accountId || !peek?.is_valid) return noStore(NextResponse.json({ error: "gone" }, { status: 410 }));

  const encryptedSecret = peek.encrypted_secret ?? "";
  if (!encryptedSecret) {
    return noStore(NextResponse.json({ error: "db_error", details: "missing_account_secret" }, { status: 500 }));
  }

  let secret = "";
  try {
    secret = await decryptSecret(encryptedSecret);
  } catch {
    return noStore(NextResponse.json({ error: "decrypt_failed" }, { status: 500 }));
  }

  const algorithm = (peek.algorithm ?? "SHA1").toUpperCase();
  const period = peek.period ?? 30;

  let code = "";
  let ttl = 0;
  if (algorithm === "STEAM") {
    let secretBytes: Uint8Array;
    try {
      secretBytes = base64urlToBytes(secret);
    } catch {
      return noStore(NextResponse.json({ error: "invalid_secret" }, { status: 500 }));
    }
    ({ code, ttl } = await generateSteamGuardCode({ secretBytes, period, cacheKey: secret }));
  } else if (algorithm === "SHA1") {
    ({ code, ttl } = await generateTotp({
      secret,
      digits: peek.digits ?? 6,
      period,
    }));
  } else {
    return noStore(NextResponse.json({ error: "unsupported_algorithm" }, { status: 400 }));
  }

  const { data: consumedRows, error: consumeError } = await supabase.rpc("consume_share_token", {
    p_token_hash: tokenHash,
    p_ip: ip,
    p_user_agent: userAgent,
  });
  if (consumeError) {
    return noStore(
      NextResponse.json({ error: "db_error", details: consumeError.message }, { status: 500 }),
    );
  }
  const consumed =
    Array.isArray(consumedRows) && consumedRows.length > 0
      ? (consumedRows[0] as { account_id?: string; payload_ciphertext?: string; consumed_at?: string | null })
      : null;

  const consumedAccountId = consumed?.account_id ?? null;
  if (!consumedAccountId) return noStore(NextResponse.json({ error: "gone" }, { status: 410 }));
  if (consumedAccountId.toLowerCase() !== accountId.toLowerCase()) {
    return noStore(NextResponse.json({ error: "invalid_payload" }, { status: 500 }));
  }

  const payload = await decryptSharePayload(consumed?.payload_ciphertext ?? "");
  if (
    payload?.accountId &&
    payload.accountId.toLowerCase() !== accountId.toLowerCase()
  ) {
    return noStore(NextResponse.json({ error: "invalid_payload" }, { status: 500 }));
  }

  return noStore(
    NextResponse.json({
      payload: {
        account: {
          id: accountId,
          label: peek.label ?? "账户",
          issuer: peek.issuer ?? null,
        },
        code,
        ttl,
      },
      consumedAt: consumed?.consumed_at ?? null,
    }),
  );
}
