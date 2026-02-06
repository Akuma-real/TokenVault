import { NextResponse } from "next/server";
import { requireApiAuth, unauthorizedJson } from "@/lib/auth";
import { readRequestBody } from "@/lib/request";
import { createShareLink } from "@/lib/share-create";
import { errorJson } from "@/lib/http-error";

export async function POST(req: Request) {
  let auth;
  try {
    auth = await requireApiAuth(req);
  } catch {
    return unauthorizedJson();
  }

  if (auth.kind !== "session") {
    return errorJson(403, "forbidden");
  }

  const body = await readRequestBody(req);
  const accountId = typeof body.accountId === "string" ? body.accountId : "";
  const result = await createShareLink({ accountId, ttlInput: body.ttlSeconds });
  if (!result.ok) {
    return NextResponse.json(result.body, { status: result.status });
  }

  const res = NextResponse.json(result.body);
  res.headers.set("Cache-Control", "no-store");
  return res;
}
