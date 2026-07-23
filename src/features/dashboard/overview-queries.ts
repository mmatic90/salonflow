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

  const [todayResult, tomorrowResult, completedResult, noShowResult] =
    await Promise.all([
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
    ]);

  const hasError = [todayResult, tomorrowResult, completedResult, noShowResult].some(
    (result) => Boolean(result.error),
  );

  if (hasError) {
    return {
      pendingOnlineCount: 0,
      todayOnlineCount: 0,
      todayAppointmentsCount: 0,
      tomorrowAppointmentsCount: 0,
      completedThisMonthCount: 0,
      noShowThisMonthCount: 0,
      onlineThisMonthCount: 0,
      onlineAcceptedThisMonthCount: 0,
      onlineConversionRate: 0,
    };
  }

  return {
    pendingOnlineCount: 0,
    todayOnlineCount: 0,
    todayAppointmentsCount: todayResult.count ?? 0,
    tomorrowAppointmentsCount: tomorrowResult.count ?? 0,
    completedThisMonthCount: completedResult.count ?? 0,
    noShowThisMonthCount: noShowResult.count ?? 0,
    onlineThisMonthCount: 0,
    onlineAcceptedThisMonthCount: 0,
    onlineConversionRate: 0,
  };
}
