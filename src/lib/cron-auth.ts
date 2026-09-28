import "server-only";

import { NextResponse } from "next/server";

export function isCronAuthorized(request: Request) {
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret) return false;

  return request.headers.get("authorization") === `Bearer ${expectedSecret}`;
}

export function cronUnauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function cronInternalError(context: string, error: unknown) {
  console.error(`[cron:${context}]`, error);
  return NextResponse.json(
    { error: "Internal cron job error." },
    { status: 500 },
  );
}
