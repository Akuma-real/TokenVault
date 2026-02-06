import { NextResponse } from "next/server";
import { readSessionFromCookies, unauthorizedJson } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { randomToken, sha256Hex } from "@/lib/crypto";
import { readRequestBody } from "@/lib/request";

export async function POST(req: Request) {
  const session = await readSessionFromCookies();
  if (!session) return unauthorizedJson();

  const body = await readRequestBody(req);
  const name = typeof body.name === "string" ? body.name.trim() : "default";
  if (!name) return NextResponse.json({ error: "name_required" }, { status: 400 });

  const token = randomToken("tvk_");
  const token_hash = await sha256Hex(token);

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("api_keys")
    .insert({ name, token_hash })
    .select("id,name,created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: "db_error", details: error.message }, { status: 500 });
  }

  const res = NextResponse.json({
    id: data?.id ?? null,
    name: data?.name ?? name,
    created_at: data?.created_at ?? null,
    token,
  });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
