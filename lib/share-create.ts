import "server-only";

import { randomToken, sha256Hex } from "@/lib/crypto";
import { encryptSharePayload, parseTtlSeconds } from "@/lib/share";
import { insertShareToken } from "@/lib/share-repo";
import { errBody, okBody, type HttpResult } from "@/lib/result";

export type CreateShareBody = {
  id: string | null;
  url: string;
  expiresAt: string;
  token: string;
  ttlSeconds: number;
};

export type CreateShareResult = HttpResult<CreateShareBody>;

export async function createShareLink(input: {
  accountId: string;
  ttlInput: unknown;
}): Promise<CreateShareResult> {
  const accountId = input.accountId.trim();
  if (!accountId) {
    return errBody(400, "accountId_required");
  }

  const ttlSeconds = parseTtlSeconds(input.ttlInput);
  const token = randomToken("tvs_");
  const tokenHash = await sha256Hex(token);
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  const payloadCiphertext = await encryptSharePayload({ v: 1, accountId });

  const { id, expiresAt: storedExpiresAt, error } = await insertShareToken({
    accountId,
    tokenHash,
    expiresAt,
    payloadCiphertext,
  });

  if (error) {
    return errBody(500, "db_error", error);
  }

  return okBody({
    id,
    url: `/s/${token}`,
    expiresAt: storedExpiresAt ?? expiresAt,
    token,
    ttlSeconds,
  });
}
