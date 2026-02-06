import "server-only";

import { NextResponse } from "next/server";
import { toErrorBody } from "@/lib/result";

export function errorJson(status: number, error: string, details?: string): NextResponse {
  return NextResponse.json(toErrorBody(error, details), { status });
}

export function dbStatusFromCode(code: string | null | undefined): number {
  return code === "PGRST116" ? 404 : 500;
}

export function dbErrorJson(details: string, status = 500): NextResponse {
  return errorJson(status, "db_error", details);
}
