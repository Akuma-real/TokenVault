import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function insertApiKey(input: {
  name: string;
  tokenHash: string;
}): Promise<{ id: string | null; name: string | null; createdAt: string | null; error: string | null }> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("api_keys")
    .insert({ name: input.name, token_hash: input.tokenHash })
    .select("id,name,created_at")
    .single();

  return {
    id: (data?.id as string | null | undefined) ?? null,
    name: (data?.name as string | null | undefined) ?? null,
    createdAt: (data?.created_at as string | null | undefined) ?? null,
    error: error?.message ?? null,
  };
}
