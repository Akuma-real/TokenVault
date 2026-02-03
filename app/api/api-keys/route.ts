import { NextResponse } from "next/server";
import { readSessionFromCookies, unauthorizedJson } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { randomToken, sha256Hex } from "@/lib/crypto";

async function readBody(req: Request): Promise<Record<string, unknown>> {
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      return (await req.json()) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  try {
    const form = await req.formData();
    const out: Record<string, unknown> = {};
    for (const [k, v] of form.entries()) out[k] = v;
    return out;
  } catch {
    return {};
  }
}

export async function POST(req: Request) {
  const session = await readSessionFromCookies();
  if (!session) return unauthorizedJson();

  const body = await readBody(req);
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

