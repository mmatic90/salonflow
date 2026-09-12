import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserPermissions } from "@/lib/permissions";

export async function GET() {
  try {
    const permissions = await getCurrentUserPermissions();

    if (!permissions) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const supabase = await createClient();

    const { count, error } = await supabase
      .from("online_booking_requests")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", permissions.organizationId)
      .eq("status", "pending");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ count: count ?? 0 });
  } catch (error) {
    console.error("Pending online booking count failed:", error);

    return NextResponse.json(
      { error: "Unable to load pending booking count." },
      { status: 503 },
    );
  }
}
