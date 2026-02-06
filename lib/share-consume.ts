import "server-only";

import { sha256Hex } from "@/lib/crypto";
import { decryptSecret } from "@/lib/secret";
import { base64urlToBytes } from "@/lib/base64url";
import { generateSteamGuardCode, generateTotp } from "@/lib/totp";
import { decryptSharePayload } from "@/lib/share";
import { consumeShareTokenAtomic, peekShareTokenWithAccount } from "@/lib/share-repo";
import { errBody, okBody, type HttpResult } from "@/lib/result";

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

  let code = "";
  let ttl = 0;
  if (algorithm === "STEAM") {
    try {
      const secretBytes = base64urlToBytes(secret);
      ({ code, ttl } = await generateSteamGuardCode({ secretBytes, period, cacheKey: secret }));
    } catch {
      return errBody(500, "invalid_secret");
    }
  } else if (algorithm === "SHA1") {
    ({ code, ttl } = await generateTotp({
      secret,
      digits: peek.digits ?? 6,
      period,
    }));
  } else {
    return errBody(400, "unsupported_algorithm");
  }

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
