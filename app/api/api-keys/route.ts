import { NextResponse } from "next/server";
import { readSessionFromCookies, unauthorizedJson } from "@/lib/auth";
import { readRequestBody } from "@/lib/request";
import { createApiKey } from "@/lib/api-key-service";

export async function POST(req: Request) {
  const session = await readSessionFromCookies();
  if (!session) return unauthorizedJson();

  const body = await readRequestBody(req);
  const name = typeof body.name === "string" ? body.name : "default";
  const result = await createApiKey({ name });
  if (!result.ok) return NextResponse.json(result.body, { status: result.status });

  const res = NextResponse.json(result.body);
  res.headers.set("Cache-Control", "no-store");
  return res;
}
