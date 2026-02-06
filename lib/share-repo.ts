import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";

export type ShareTokenWithAccount = {
  account_id?: string;
  payload_ciphertext?: string;
  expires_at?: string;
  consumed_at?: string | null;
  is_valid?: boolean;
  label?: string;
  issuer?: string | null;
  encrypted_secret?: string;
  digits?: number;
  period?: number;
  algorithm?: string;
};

export type ConsumedShareToken = {
  account_id?: string;
  payload_ciphertext?: string;
  consumed_at?: string | null;
};

function firstRow<T>(rows: unknown): T | null {
  return Array.isArray(rows) && rows.length > 0 ? (rows[0] as T) : null;
}

export async function insertShareToken(input: {
  accountId: string;
  tokenHash: string;
  expiresAt: string;
  payloadCiphertext: string;
}): Promise<{ id: string | null; expiresAt: string | null; error: string | null }> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("share_tokens")
    .insert({
      account_id: input.accountId,
      token_hash: input.tokenHash,
      expires_at: input.expiresAt,
      payload_ciphertext: input.payloadCiphertext,
    })
    .select("id,expires_at")
    .single();

  return {
    id: (data?.id as string | null | undefined) ?? null,
    expiresAt: (data?.expires_at as string | null | undefined) ?? null,
    error: error?.message ?? null,
  };
}

export async function peekShareTokenWithAccount(
  tokenHash: string,
): Promise<{ row: ShareTokenWithAccount | null; error: string | null }> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc("peek_share_token_with_account", {
    p_token_hash: tokenHash,
  });

  return {
    row: firstRow<ShareTokenWithAccount>(data),
    error: error?.message ?? null,
  };
}

export async function consumeShareTokenAtomic(input: {
  tokenHash: string;
  ip: string | null;
  userAgent: string | null;
}): Promise<{ row: ConsumedShareToken | null; error: string | null }> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc("consume_share_token", {
    p_token_hash: input.tokenHash,
    p_ip: input.ip,
    p_user_agent: input.userAgent,
  });

  return {
    row: firstRow<ConsumedShareToken>(data),
    error: error?.message ?? null,
  };
}
