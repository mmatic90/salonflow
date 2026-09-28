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

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  const { data, error } = await supabase
    .from("online_booking_requests")
    .update({
      archived_at: new Date().toISOString(),
    })
    .is("archived_at", null)
    .in("status", ["accepted", "rejected"])
    .lt("created_at", cutoff.toISOString())
    .select("id");

  if (error) {
    return cronInternalError("archive-online-booking", error);
  }

  return NextResponse.json({
    ok: true,
    archived: data?.length ?? 0,
  });
}
