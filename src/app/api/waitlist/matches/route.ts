import { NextResponse } from "next/server";
import { findWaitlistMatches } from "@/features/waitlist/matching";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const entryId = url.searchParams.get("entry_id")?.trim();

  if (!entryId) {
    return NextResponse.json(
      { error: "Nedostaje zapis liste čekanja.", matches: [] },
      { status: 400 },
    );
  }

  const result = await findWaitlistMatches(entryId);
  if (result.error) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result);
}
