import "server-only";

import { base64urlToBytes, bytesToBase64url, bytesToUtf8, utf8ToBytes } from "@/lib/base64url";
import { env } from "@/lib/env";

const SECRET_SALT = utf8ToBytes("TokenVault:v1:secrets") as unknown as BufferSource;
let cachedSecretKey: Promise<CryptoKey> | null = null;
function getSecretKey(): Promise<CryptoKey> {
  if (!cachedSecretKey) {
    cachedSecretKey = (async () => {
      const baseKey = await crypto.subtle.importKey(
        "raw",
        utf8ToBytes(env.ADMIN_PASSWORD) as unknown as BufferSource,
        "PBKDF2",
        false,
        ["deriveKey"],
      );
      return crypto.subtle.deriveKey(
        { name: "PBKDF2", salt: SECRET_SALT, iterations: 210_000, hash: "SHA-256" },
        baseKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"],
      );
    })();
  }
  return cachedSecretKey;
}

export async function encryptSecret(plaintext: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await getSecretKey();
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    utf8ToBytes(plaintext) as unknown as BufferSource,
  );
  return `v1.${bytesToBase64url(iv)}.${bytesToBase64url(new Uint8Array(ciphertext))}`;
}

export async function decryptSecret(encrypted: string): Promise<string> {
  const [v, ivB64, ctB64] = encrypted.split(".");
  if (v !== "v1" || !ivB64 || !ctB64) {
    throw new Error("Invalid encrypted_secret format");
  }
  const iv = base64urlToBytes(ivB64);
  const ciphertext = base64urlToBytes(ctB64);
  const key = await getSecretKey();
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as unknown as BufferSource },
    key,
    ciphertext as unknown as BufferSource,
  );
  return bytesToUtf8(new Uint8Array(plaintext));
}
