const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function normalizeBase32(input: string): string {
  return input
    .trim()
    .toUpperCase()
    .replace(/=+$/g, "")
    .replace(/[\s-]/g, "");
}

export function decodeBase32(input: string): Uint8Array {
  const clean = normalizeBase32(input);
  if (clean.length === 0) return new Uint8Array();

  let bits = 0;
  let value = 0;
  const out: number[] = [];

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i]!;
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx === -1) {
      throw new Error(`Invalid base32 character: ${ch}`);
    }
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return new Uint8Array(out);
}

export function normalizeBase32Secret(input: string): string {
  return normalizeBase32(input);
}

