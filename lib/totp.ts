import { decodeBase32, normalizeBase32Secret } from "@/lib/base32";

type TotpParams = {
  secret: string; // base32
  digits?: number;
  period?: number;
};

const STEAM_CHARS = "23456789BCDFGHJKMNPQRTVWXY";
const HMAC_SHA1_KEY_CACHE_LIMIT = 512;
const hmacSha1KeyCache = new Map<string, Promise<CryptoKey>>();

function counterToBytes(counter: number): Uint8Array {
  const bytes = new Uint8Array(8);
  let x = counter;
  for (let i = 7; i >= 0; i--) {
    bytes[i] = x & 0xff;
    x = Math.floor(x / 256);
  }
  return bytes;
}

function padCode(num: number, digits: number): string {
  const s = String(num);
  return s.length >= digits ? s : "0".repeat(digits - s.length) + s;
}

function dynamicTruncate(hmac: Uint8Array): number {
  const offset = hmac[hmac.length - 1]! & 0x0f;
  return (
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff)
  );
}

function importHmacSha1Key(keyBytes: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    keyBytes as unknown as BufferSource,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
}

function getCachedHmacSha1Key(cacheKey: string, readKeyBytes: () => Uint8Array): Promise<CryptoKey> {
  const existing = hmacSha1KeyCache.get(cacheKey);
  if (existing) return existing;

  if (hmacSha1KeyCache.size >= HMAC_SHA1_KEY_CACHE_LIMIT) {
    const oldest = hmacSha1KeyCache.keys().next().value;
    if (oldest) hmacSha1KeyCache.delete(oldest);
  }

  const pending = importHmacSha1Key(readKeyBytes()).catch((error) => {
    hmacSha1KeyCache.delete(cacheKey);
    throw error;
  });
  hmacSha1KeyCache.set(cacheKey, pending);
  return pending;
}

async function signCounterHmac(key: CryptoKey, counter: number): Promise<Uint8Array> {
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    counterToBytes(counter) as unknown as BufferSource,
  );
  return new Uint8Array(mac);
}

export async function generateTotp(params: TotpParams): Promise<{ code: string; ttl: number }> {
  const digits = params.digits ?? 6;
  const period = params.period ?? 30;
  const secret = normalizeBase32Secret(params.secret);
  const key = await getCachedHmacSha1Key(`totp:${secret}`, () => decodeBase32(secret));

  const nowMs = Date.now();
  const nowSec = Math.floor(nowMs / 1000);
  const counter = Math.floor(nowSec / period);
  const ttl = period - (nowSec % period);

  const hmac = await signCounterHmac(key, counter);
  const binCode = dynamicTruncate(hmac);

  const mod = 10 ** digits;
  const code = padCode(binCode % mod, digits);
  return { code, ttl };
}

export async function generateSteamGuardCode(params: {
  secretBytes: Uint8Array;
  period?: number;
  cacheKey?: string;
}): Promise<{ code: string; ttl: number }> {
  const period = params.period ?? 30;

  const nowSec = Math.floor(Date.now() / 1000);
  const counter = Math.floor(nowSec / period);
  const ttl = period - (nowSec % period);

  const key = params.cacheKey
    ? await getCachedHmacSha1Key(`steam:${params.cacheKey}`, () => params.secretBytes.slice())
    : await importHmacSha1Key(params.secretBytes);

  const hmac = await signCounterHmac(key, counter);
  let n = dynamicTruncate(hmac);

  let out = "";
  for (let i = 0; i < 5; i++) {
    out += STEAM_CHARS[n % STEAM_CHARS.length]!;
    n = Math.floor(n / STEAM_CHARS.length);
  }
  return { code: out, ttl };
}
