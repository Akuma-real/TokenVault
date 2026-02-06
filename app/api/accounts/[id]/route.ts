import { NextResponse } from "next/server";
import { requireApiAuth, unauthorizedJson } from "@/lib/auth";
import { redirect303 } from "@/lib/http";
import { readRequestBody } from "@/lib/request";
import { getAccountConfigErrorStatus, preparePatchAccountPayload } from "@/lib/account-config";
import { deleteAccount, getAccountAlgorithm, getAccountByIdForApi, updateAccount } from "@/lib/account-repo";
import { dbErrorJson, dbStatusFromCode, errorJson } from "@/lib/http-error";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  try {
    await requireApiAuth(req);
  } catch {
    return unauthorizedJson();
  }

  const { id } = await params;
  const { data, error, code } = await getAccountByIdForApi(id);

  if (error) {
    return dbErrorJson(error, dbStatusFromCode(code));
  }

  const res = NextResponse.json({ account: data });
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    await requireApiAuth(req);
  } catch {
    return unauthorizedJson();
  }

  const { id } = await params;
  const body = await readRequestBody(req);

  const { algorithm, error: existingError, code } = await getAccountAlgorithm(id);

  if (existingError || !algorithm) {
    return dbErrorJson(existingError ?? "not_found", dbStatusFromCode(code));
  }

  const patchResult = await preparePatchAccountPayload(body, algorithm);
  if (!patchResult.ok) {
    const status = getAccountConfigErrorStatus(patchResult.error);
    return errorJson(status, patchResult.error, patchResult.details);
  }

  const patch = patchResult.value;

  const { error } = await updateAccount(id, patch);
  if (error) {
    return dbErrorJson(error);
  }

  const accept = req.headers.get("accept") ?? "";
  const wantsHtml = accept.includes("text/html");
  const res = wantsHtml
    ? redirect303("/accounts")
    : NextResponse.json({ ok: true });

  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function DELETE(req: Request, { params }: Params) {
  try {
    await requireApiAuth(req);
  } catch {
    return unauthorizedJson();
  }

  const { id } = await params;
  const { error } = await deleteAccount(id);
  if (error) {
    return dbErrorJson(error);
  }

  const accept = req.headers.get("accept") ?? "";
  const wantsHtml = accept.includes("text/html");
  const res = wantsHtml
    ? redirect303("/accounts")
    : NextResponse.json({ ok: true });

  res.headers.set("Cache-Control", "no-store");
  return res;
}
