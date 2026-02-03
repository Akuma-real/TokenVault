import "server-only";

import { bytesToBase64url, utf8ToBytes } from "@/lib/base64url";

function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

export function randomToken(prefix: string, sizeBytes = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(sizeBytes));
  return `${prefix}${bytesToBase64url(bytes)}`;
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    utf8ToBytes(input) as unknown as BufferSource,
  );
  return bytesToHex(new Uint8Array(digest));
}

