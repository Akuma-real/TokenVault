const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(base64, "base64"));
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function utf8ToBytes(input: string): Uint8Array {
  const encoded = textEncoder.encode(input);
  const out = new Uint8Array(encoded.length);
  out.set(encoded);
  return out;
}

export function bytesToUtf8(bytes: Uint8Array): string {
  return textDecoder.decode(bytes);
}

export function bytesToBase64url(bytes: Uint8Array): string {
  return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function base64urlToBytes(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padding = base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4));
  return base64ToBytes(base64 + padding);
}

export function normalizeToBase64url(input: string): string {
  const compact = input.trim().replace(/\s+/g, "");
  if (compact.length === 0) throw new Error("Empty base64 input");

  const normalized = compact.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  if (!/^[A-Za-z0-9_-]+$/.test(normalized)) {
    throw new Error("Invalid base64/base64url input");
  }
  return normalized;
}
