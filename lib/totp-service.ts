import "server-only";

import { decryptSecret } from "@/lib/secret";
import { base64urlToBytes } from "@/lib/base64url";
import { generateSteamGuardCode, generateTotp } from "@/lib/totp";
import { getTotpAccountSecret } from "@/lib/totp-repo";
import { errBody, okBody, type HttpResult } from "@/lib/result";

type GetTotpResult = HttpResult<{ code: string; ttl: number }>;

export async function getTotpByAccountId(accountId: string): Promise<GetTotpResult> {
  const { data, error, code } = await getTotpAccountSecret(accountId);
  if (error || !data) {
    const status = code === "PGRST116" ? 404 : 500;
    return errBody(status, "db_error", error ?? "not_found");
  }

  let secret = "";
  try {
    secret = await decryptSecret(data.encrypted_secret);
  } catch {
    return errBody(500, "decrypt_failed");
  }

  const algorithm = (data.algorithm ?? "SHA1").toUpperCase();
  const period = data.period ?? 30;

  if (algorithm === "STEAM") {
    try {
      const secretBytes = base64urlToBytes(secret);
      const { code, ttl } = await generateSteamGuardCode({ secretBytes, period, cacheKey: secret });
      return okBody({ code, ttl });
    } catch {
      return errBody(500, "invalid_secret");
    }
  }

  if (algorithm === "SHA1") {
    const { code, ttl } = await generateTotp({
      secret,
      digits: data.digits ?? 6,
      period,
    });
    return okBody({ code, ttl });
  }

  return errBody(400, "unsupported_algorithm");
}
