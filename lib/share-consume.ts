import "server-only";

import { sha256Hex } from "@/lib/crypto";
import { decryptSecret } from "@/lib/secret";
import { base64urlToBytes } from "@/lib/base64url";
import { generateSteamGuardCode, generateTotp } from "@/lib/totp";
import { decryptSharePayload } from "@/lib/share";
import { consumeShareTokenAtomic, peekShareTokenWithAccount } from "@/lib/share-repo";
import { errBody, okBody, type HttpResult } from "@/lib/result";

const MIN_SHARE_CODE_TTL_SECONDS = 8;
const NEXT_WINDOW_PADDING_MS = 180;
const SHARE_CONSUME_SAFETY_BUFFER_MS = 1500;

export type ConsumeShareBody = {
  payload: {
    account: {
      id: string;
      label: string;
      issuer: string | null;
    };
    code: string;
    ttl: number;
  };
  consumedAt: string | null;
};

export type ConsumeShareResult = HttpResult<ConsumeShareBody>;

type ConsumeInput = {
  token: string;
  ip: string | null;
  userAgent: string | null;
};

type GeneratedShareCode =
  | {
      code: string;
      ttl: number;
    }
  | {
      error: "invalid_secret" | "unsupported_algorithm";
      status: 400 | 500;
    };

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getNextWindowWaitMs(ttl: number, expiresAt?: string): number | null {
  if (ttl > MIN_SHARE_CODE_TTL_SECONDS) return null;

  const waitMs = Math.max(0, ttl * 1000 + NEXT_WINDOW_PADDING_MS);
  if (!expiresAt) return waitMs;

  const expiresAtMs = new Date(expiresAt).getTime();
  if (Number.isNaN(expiresAtMs)) return waitMs;
  if (Date.now() + waitMs + SHARE_CONSUME_SAFETY_BUFFER_MS >= expiresAtMs) return null;

  return waitMs;
}

async function generateShareCode(params: {
  algorithm: string;
  secret: string;
  digits: number;
  period: number;
}): Promise<GeneratedShareCode> {
  if (params.algorithm === "STEAM") {
    try {
      const secretBytes = base64urlToBytes(params.secret);
      const { code, ttl } = await generateSteamGuardCode({
        secretBytes,
        period: params.period,
        cacheKey: params.secret,
      });
      return { code, ttl };
    } catch {
      return { error: "invalid_secret", status: 500 };
    }
  }

  if (params.algorithm === "SHA1") {
    const { code, ttl } = await generateTotp({
      secret: params.secret,
      digits: params.digits,
      period: params.period,
    });
    return { code, ttl };
  }

  return { error: "unsupported_algorithm", status: 400 };
}

export async function consumeShareToken(input: ConsumeInput): Promise<ConsumeShareResult> {
  const tokenHash = await sha256Hex(input.token);
  const { row: peek, error: peekError } = await peekShareTokenWithAccount(tokenHash);
  if (peekError) return errBody(500, "db_error", peekError);

  const accountId = peek?.account_id ?? null;
  if (!accountId || !peek?.is_valid) return errBody(410, "gone");

  const encryptedSecret = peek.encrypted_secret ?? "";
  if (!encryptedSecret) {
    return errBody(500, "db_error", "missing_account_secret");
  }

  let secret = "";
  try {
    secret = await decryptSecret(encryptedSecret);
  } catch {
    return errBody(500, "decrypt_failed");
  }

  const algorithm = (peek.algorithm ?? "SHA1").toUpperCase();
  const period = peek.period ?? 30;
  const digits = peek.digits ?? 6;

  let generated = await generateShareCode({
    algorithm,
    secret,
    digits,
    period,
  });
  if ("error" in generated) return errBody(generated.status, generated.error);

  const waitMs = getNextWindowWaitMs(generated.ttl, peek.expires_at);
  if (waitMs !== null) {
    await sleep(waitMs);
    generated = await generateShareCode({
      algorithm,
      secret,
      digits,
      period,
    });
    if ("error" in generated) return errBody(generated.status, generated.error);
  }

  const code = generated.code;
  const ttl = generated.ttl;

  const { row: consumed, error: consumeError } = await consumeShareTokenAtomic({
    tokenHash,
    ip: input.ip,
    userAgent: input.userAgent,
  });
  if (consumeError) return errBody(500, "db_error", consumeError);

  const consumedAccountId = consumed?.account_id ?? null;
  if (!consumedAccountId) return errBody(410, "gone");
  if (consumedAccountId.toLowerCase() !== accountId.toLowerCase()) {
    return errBody(500, "invalid_payload");
  }

  const payload = await decryptSharePayload(consumed?.payload_ciphertext ?? "");
  if (payload?.accountId && payload.accountId.toLowerCase() !== accountId.toLowerCase()) {
    return errBody(500, "invalid_payload");
  }

  return okBody({
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
  });
}
