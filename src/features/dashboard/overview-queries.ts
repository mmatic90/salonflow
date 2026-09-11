import { createClient } from "@/lib/supabase/server";

function formatDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getMonthStartValue(date: Date) {
  return formatDateInputValue(new Date(date.getFullYear(), date.getMonth(), 1));
}

export async function getDashboardOverviewStats(organizationId: string) {
  const supabase = await createClient();

  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayValue = formatDateInputValue(today);
  const tomorrowValue = formatDateInputValue(tomorrow);
  const monthStartValue = getMonthStartValue(today);
  const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1).toISOString();
  const monthStartIso = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

  const [
    todayResult,
    tomorrowResult,
    completedResult,
    noShowResult,
    pendingOnlineResult,
    todayOnlineResult,
    onlineMonthResult,
  ] = await Promise.all([
      supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("appointment_date", todayValue)
        .in("status", ["scheduled", "confirmed"]),
      supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("appointment_date", tomorrowValue)
        .in("status", ["scheduled", "confirmed"]),
      supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .gte("appointment_date", monthStartValue)
        .eq("status", "completed"),
      supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .gte("appointment_date", monthStartValue)
        .eq("status", "no_show"),
      supabase
        .from("online_booking_requests")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .is("archived_at", null)
        .eq("status", "pending"),
      supabase
        .from("online_booking_requests")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .is("archived_at", null)
        .eq("requested_date", todayValue),
      supabase
        .from("online_booking_requests")
        .select("id, status, created_at")
        .eq("organization_id", organizationId)
        .gte("created_at", monthStartIso)
        .lt("created_at", nextMonthStart),
    ]);

  const appointmentHasError = [todayResult, tomorrowResult, completedResult, noShowResult].some(
    (result) => Boolean(result.error),
  );

  const onlineRows = onlineMonthResult.error ? [] : (onlineMonthResult.data ?? []);
  const onlineThisMonthCount = onlineRows.length;
  const onlineAcceptedThisMonthCount = onlineRows.filter((item: any) => item.status === "accepted").length;
  const onlineConversionRate = onlineThisMonthCount > 0
    ? Math.round((onlineAcceptedThisMonthCount / onlineThisMonthCount) * 100)
    : 0;

  return {
    pendingOnlineCount: pendingOnlineResult.error ? 0 : (pendingOnlineResult.count ?? 0),
    todayOnlineCount: todayOnlineResult.error ? 0 : (todayOnlineResult.count ?? 0),
    todayAppointmentsCount: appointmentHasError ? 0 : (todayResult.count ?? 0),
    tomorrowAppointmentsCount: appointmentHasError ? 0 : (tomorrowResult.count ?? 0),
    completedThisMonthCount: appointmentHasError ? 0 : (completedResult.count ?? 0),
    noShowThisMonthCount: appointmentHasError ? 0 : (noShowResult.count ?? 0),
    onlineThisMonthCount,
    onlineAcceptedThisMonthCount,
    onlineConversionRate,
  };
}
