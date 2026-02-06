import { NextResponse } from "next/server";
import { requireApiAuth, unauthorizedJson } from "@/lib/auth";
import { redirect303 } from "@/lib/http";
import { readRequestBody } from "@/lib/request";
import { getAccountConfigErrorStatus, prepareCreateAccountPayload } from "@/lib/account-config";
import { createAccount, listAccountsForApi } from "@/lib/account-repo";
import { dbErrorJson, errorJson } from "@/lib/http-error";

export async function GET(req: Request) {
  try {
    await requireApiAuth(req);
  } catch {
    return unauthorizedJson();
  }

  const { data, error } = await listAccountsForApi();

  if (error) {
    return dbErrorJson(error);
  }
  const res = NextResponse.json({ accounts: data });
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function POST(req: Request) {
  try {
    await requireApiAuth(req);
  } catch {
    return unauthorizedJson();
  }

  const body = await readRequestBody(req);
  const createResult = await prepareCreateAccountPayload(body);
  if (!createResult.ok) {
    const status = getAccountConfigErrorStatus(createResult.error);
    return errorJson(status, createResult.error, createResult.details);
  }

  const { id, error } = await createAccount(createResult.value);

  if (error) {
    return dbErrorJson(error);
  }

  const accept = req.headers.get("accept") ?? "";
  const wantsHtml = accept.includes("text/html");
  const res = wantsHtml
    ? redirect303("/accounts")
    : NextResponse.json({ ok: true, id });

  res.headers.set("Cache-Control", "no-store");
  return res;
}
