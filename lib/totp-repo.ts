import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";

export type TotpAccountSecretRow = {
  encrypted_secret: string;
  digits: number | null;
  period: number | null;
  algorithm: string | null;
};

export async function getTotpAccountSecret(
  accountId: string,
): Promise<{ data: TotpAccountSecretRow | null; error: string | null; code: string | null }> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("accounts")
    .select("encrypted_secret,digits,period,algorithm")
    .eq("id", accountId)
    .single();

  return {
    data: (data as TotpAccountSecretRow | null) ?? null,
    error: error?.message ?? null,
    code: error?.code ?? null,
  };
}
