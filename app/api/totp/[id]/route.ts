import { NextResponse } from "next/server";
import { requireApiAuth, unauthorizedJson } from "@/lib/auth";
import { getTotpByAccountId } from "@/lib/totp-service";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiAuth(req);
  } catch {
    return unauthorizedJson();
  }

  const { id } = await params;
  const result = await getTotpByAccountId(id);
  if (!result.ok) {
    return NextResponse.json(result.body, { status: result.status });
  }

  const res = NextResponse.json(result.body);
  res.headers.set("Cache-Control", "no-store");
  return res;
}
