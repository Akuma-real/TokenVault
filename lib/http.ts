import "server-only";

import { NextResponse } from "next/server";

export function redirect303(location: string): NextResponse {
  const res = new NextResponse(null, { status: 303 });
  res.headers.set("Location", location);
  return res;
}
