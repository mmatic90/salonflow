import { NextResponse } from "next/server";
import { findWaitingClientsForSlot } from "@/features/waitlist/slot-matching";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const date = url.searchParams.get("date")?.trim() ?? "";
  const startTime = url.searchParams.get("start_time")?.trim() ?? "";
  const serviceId = url.searchParams.get("service_id")?.trim() ?? "";
  const employeeId = url.searchParams.get("employee_id")?.trim() ?? "";
  const roomId = url.searchParams.get("room_id")?.trim() ?? "";

  const result = await findWaitingClientsForSlot({
    date,
    startTime,
    serviceId,
    employeeId,
    roomId,
  });

  if (result.error) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result);
}
