import { NextResponse } from "next/server";
import { readRequestBody } from "@/lib/request";
import { consumeShareToken } from "@/lib/share-consume";
import { errorJson } from "@/lib/http-error";

function noStore(res: NextResponse): NextResponse {
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function POST(req: Request) {
  const body = await readRequestBody(req);
  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token) return noStore(errorJson(400, "token_required"));
  const forwardedFor = req.headers.get("x-forwarded-for");
  const ip = forwardedFor ? forwardedFor.split(",")[0]?.trim() ?? null : null;
  const userAgent = req.headers.get("user-agent");

  const result = await consumeShareToken({ token, ip, userAgent });
  if (!result.ok) {
    return noStore(NextResponse.json(result.body, { status: result.status }));
  }

  return noStore(NextResponse.json(result.body));
}
