import { decodeBase32, normalizeBase32Secret } from "@/lib/base32";

type TotpParams = {
  secret: string; // base32
  digits?: number;
  period?: number;
};

const STEAM_CHARS = "23456789BCDFGHJKMNPQRTVWXY";

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

export async function generateTotp(params: TotpParams): Promise<{ code: string; ttl: number }> {
  const digits = params.digits ?? 6;
  const period = params.period ?? 30;
  const secret = normalizeBase32Secret(params.secret);
  const keyBytes = decodeBase32(secret);

  const nowMs = Date.now();
  const nowSec = Math.floor(nowMs / 1000);
  const counter = Math.floor(nowSec / period);
  const ttl = period - (nowSec % period);

  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes as unknown as BufferSource,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );

  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    counterToBytes(counter) as unknown as BufferSource,
  );
  const hmac = new Uint8Array(mac);
  const binCode = dynamicTruncate(hmac);

  const mod = 10 ** digits;
  const code = padCode(binCode % mod, digits);
  return { code, ttl };
}

export async function generateSteamGuardCode(params: {
  secretBytes: Uint8Array;
  period?: number;
}): Promise<{ code: string; ttl: number }> {
  const period = params.period ?? 30;

  const nowSec = Math.floor(Date.now() / 1000);
  const counter = Math.floor(nowSec / period);
  const ttl = period - (nowSec % period);

  const key = await crypto.subtle.importKey(
    "raw",
    params.secretBytes as unknown as BufferSource,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );

  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    counterToBytes(counter) as unknown as BufferSource,
  );
  const hmac = new Uint8Array(mac);
  let n = dynamicTruncate(hmac);

  let out = "";
  for (let i = 0; i < 5; i++) {
    out += STEAM_CHARS[n % STEAM_CHARS.length]!;
    n = Math.floor(n / STEAM_CHARS.length);
  }
  return { code: out, ttl };
}
