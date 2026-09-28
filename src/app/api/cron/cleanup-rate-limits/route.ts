import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  cronInternalError,
  cronUnauthorizedResponse,
  isCronAuthorized,
} from "@/lib/cron-auth";

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return cronUnauthorizedResponse();
  }

  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from("public_api_rate_limits")
    .delete()
    .lt("created_at", cutoff);

  if (error) {
    return cronInternalError("cleanup-rate-limits", error);
  }

  return NextResponse.json({ ok: true });
}
