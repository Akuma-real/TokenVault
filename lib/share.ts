import "server-only";

import { decryptSecret, encryptSecret } from "@/lib/secret";

export type SharePayloadV1 = {
  v: 1;
  accountId: string;
};

function asOptionalInt(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return Math.floor(value);
  if (typeof value === "string" && value.trim().length > 0) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.floor(n) : undefined;
  }
  return undefined;
}

export function clampTtlSeconds(ttlSeconds: number): number {
  if (!Number.isFinite(ttlSeconds)) return 300;
  if (ttlSeconds < 30) return 30;
  if (ttlSeconds > 3600) return 3600;
  return Math.floor(ttlSeconds);
}

export function parseTtlSeconds(input: unknown): number {
  return clampTtlSeconds(asOptionalInt(input) ?? 300);
}

export async function encryptSharePayload(payload: SharePayloadV1): Promise<string> {
  return encryptSecret(JSON.stringify(payload));
}

export async function decryptSharePayload(ciphertext: string): Promise<SharePayloadV1 | null> {
  const trimmed = ciphertext.trim();
  if (!trimmed) return null;
  try {
    const json = await decryptSecret(trimmed);
    const parsed = JSON.parse(json) as Partial<SharePayloadV1>;
    if (parsed?.v !== 1) return null;
    if (typeof parsed.accountId !== "string" || parsed.accountId.trim().length === 0) return null;
    return { v: 1, accountId: parsed.accountId.trim() };
  } catch {
    return null;
  }
}

