import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { CreateAccountPayload, PatchPayload } from "@/lib/account-config";

export type AccountRecord = {
  id: string;
  label: string;
  issuer: string | null;
  digits: number;
  period: number;
  algorithm: string;
};

export async function listAccountsForApi(): Promise<{ data: unknown[]; error: string | null }> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("accounts")
    .select("id,label,issuer,digits,period,algorithm,created_at,updated_at")
    .order("created_at", { ascending: false });

  return { data: data ?? [], error: error?.message ?? null };
}

export async function listAccountsForPage(): Promise<{ data: AccountRecord[]; error: string | null }> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("accounts")
    .select("id,label,issuer,digits,period,algorithm")
    .order("created_at", { ascending: false });

  return { data: (data ?? []) as AccountRecord[], error: error?.message ?? null };
}

export async function getAccountByIdForApi(
  id: string,
): Promise<{ data: unknown | null; error: string | null; code: string | null }> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("accounts")
    .select("id,label,issuer,digits,period,algorithm,created_at,updated_at")
    .eq("id", id)
    .single();

  return {
    data: data ?? null,
    error: error?.message ?? null,
    code: error?.code ?? null,
  };
}

export async function getAccountForEdit(
  id: string,
): Promise<{ data: AccountRecord | null; error: string | null; code: string | null }> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("accounts")
    .select("id,label,issuer,digits,period,algorithm")
    .eq("id", id)
    .single();

  return {
    data: (data as AccountRecord | null) ?? null,
    error: error?.message ?? null,
    code: error?.code ?? null,
  };
}

export async function getAccountAlgorithm(
  id: string,
): Promise<{ algorithm: string | null; error: string | null; code: string | null }> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("accounts")
    .select("algorithm")
    .eq("id", id)
    .single();

  return {
    algorithm: (data?.algorithm as string | null | undefined) ?? null,
    error: error?.message ?? null,
    code: error?.code ?? null,
  };
}

export async function createAccount(
  payload: CreateAccountPayload,
): Promise<{ id: string | null; error: string | null }> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("accounts")
    .insert(payload)
    .select("id")
    .single();

  return {
    id: (data?.id as string | null | undefined) ?? null,
    error: error?.message ?? null,
  };
}

export async function updateAccount(
  id: string,
  patch: PatchPayload,
): Promise<{ error: string | null }> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("accounts").update(patch).eq("id", id);
  return { error: error?.message ?? null };
}

export async function deleteAccount(
  id: string,
): Promise<{ error: string | null }> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("accounts").delete().eq("id", id);
  return { error: error?.message ?? null };
}
