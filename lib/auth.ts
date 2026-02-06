import "server-only";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { base64urlToBytes, bytesToBase64url, bytesToUtf8, utf8ToBytes } from "@/lib/base64url";
import { env } from "@/lib/env";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { sha256Hex } from "@/lib/crypto";
import { errorJson } from "@/lib/http-error";

const SESSION_COOKIE_NAME = "tv_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7d
let cachedSessionKey: Promise<CryptoKey> | null = null;
function getSessionKey(): Promise<CryptoKey> {
  if (!cachedSessionKey) {
    cachedSessionKey = crypto.subtle.importKey(
      "raw",
      utf8ToBytes(`TokenVault:v1:session:${env.ADMIN_PASSWORD}`) as unknown as BufferSource,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"],
    );
  }
  return cachedSessionKey;
}

export type Session = {
  v: 1;
  iat: number;
  exp: number;
};

export type ApiAuth =
  | { kind: "session"; session: Session }
  | { kind: "api_key"; apiKeyId: string };

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function sign(input: string): Promise<Uint8Array> {
  const key = await getSessionKey();
  const sig = await crypto.subtle.sign("HMAC", key, utf8ToBytes(input) as unknown as BufferSource);
  return new Uint8Array(sig);
}

async function verifySignature(input: string, signature: Uint8Array): Promise<boolean> {
  const expected = await sign(input);
  return constantTimeEqual(expected, signature);
}

export async function createSessionCookie(): Promise<{ name: string; value: string; maxAge: number }> {
  const now = Math.floor(Date.now() / 1000);
  const payload: Session = {
    v: 1,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };
  const payloadB64 = bytesToBase64url(utf8ToBytes(JSON.stringify(payload)));
  const sigB64 = bytesToBase64url(await sign(payloadB64));
  return { name: SESSION_COOKIE_NAME, value: `${payloadB64}.${sigB64}`, maxAge: SESSION_TTL_SECONDS };
}

export async function readSessionFromCookies(): Promise<Session | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!cookie) return null;
  const parts = cookie.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;
  let payloadJson = "";
  try {
    payloadJson = bytesToUtf8(base64urlToBytes(payloadB64));
  } catch {
    return null;
  }
  let session: Session;
  try {
    session = JSON.parse(payloadJson) as Session;
  } catch {
    return null;
  }
  if (!session || session.v !== 1 || typeof session.exp !== "number") return null;
  if (session.exp <= Math.floor(Date.now() / 1000)) return null;
  const sigBytes = (() => {
    try {
      return base64urlToBytes(sigB64);
    } catch {
      return null;
    }
  })();
  if (!sigBytes) return null;
  const ok = await verifySignature(payloadB64, sigBytes);
  return ok ? session : null;
}

function readBearerToken(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (!auth) return null;
  const m = auth.match(/^Bearer\s+(.+)$/i);
  const token = m?.[1]?.trim() ?? "";
  return token.length > 0 ? token : null;
}

async function tryApiKeyAuth(req: Request): Promise<ApiAuth | null> {
  const token = readBearerToken(req);
  if (!token) return null;
  const tokenHash = await sha256Hex(token);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("api_keys")
    .select("id,revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || !data || data.revoked_at) return null;
  void (async () => {
    try {
      await supabase
        .from("api_keys")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", data.id);
    } catch {
      // ignore
    }
  })();
  return { kind: "api_key", apiKeyId: data.id as string };
}

export async function requireApiAuth(req?: Request): Promise<ApiAuth> {
  if (req) {
    const apiKeyAuth = await tryApiKeyAuth(req);
    if (apiKeyAuth) return apiKeyAuth;
  }
  const session = await readSessionFromCookies();
  if (!session) throw new Error("UNAUTHORIZED");
  return { kind: "session", session };
}

export function unauthorizedJson(): NextResponse {
  return errorJson(401, "unauthorized");
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function setSessionCookie(res: NextResponse): Promise<void> {
  const cookie = await createSessionCookie();
  res.cookies.set(cookie.name, cookie.value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: cookie.maxAge,
  });
}
