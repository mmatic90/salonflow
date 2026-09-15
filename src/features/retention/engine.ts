export type RetentionReasonCode =
  | "overdue_cadence"
  | "inactive_client"
  | "no_future_booking"
  | "attendance_risk";

export type RetentionPriority = "high" | "medium" | "low";
export type RetentionActionCode =
  | "contacted"
  | "snoozed"
  | "resolved"
  | "ignored";

export type MarketingEmailStatus = "unknown" | "allowed" | "not_allowed";

export type RetentionCandidate = {
  clientId: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  marketingEmailStatus: MarketingEmailStatus;
  signalKey: string;
  reasonCode: RetentionReasonCode;
  priority: RetentionPriority;
  completedCount: number;
  lastCompleted: string | null;
  daysSinceLastVisit: number | null;
  averageDaysBetweenVisits: number | null;
  cancelledCount: number;
  noShowCount: number;
  noShowRate: number;
  cancellationRate: number;
};

export type RetentionHistoryItem = {
  id: string;
  clientId: string;
  clientName: string;
  reasonCode: RetentionReasonCode;
  action: RetentionActionCode;
  snoozedUntil: string | null;
  createdAt: string;
};

export type RetentionOverview = {
  candidates: RetentionCandidate[];
  history: RetentionHistoryItem[];
  stats: {
    total: number;
    high: number;
    medium: number;
    low: number;
    snoozed: number;
  };
};

export type RetentionAppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

export type RetentionRawClient = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  marketing_email_status: MarketingEmailStatus | null;
};

export type RetentionRawAppointment = {
  client_id: string | null;
  appointment_date: string;
  status: RetentionAppointmentStatus;
};

export type RetentionRawAction = {
  id: string;
  client_id: string;
  signal_key: string;
  reason_code: RetentionReasonCode;
  action: RetentionActionCode;
  snoozed_until: string | null;
  created_at: string;
};

function fullName(client: RetentionRawClient) {
  return (
    [client.first_name, client.last_name].filter(Boolean).join(" ").trim() ||
    "Klijent bez imena"
  );
}

function dateDiffDays(earlier: string, later: string) {
  const start = new Date(`${earlier}T12:00:00Z`).getTime();
  const end = new Date(`${later}T12:00:00Z`).getTime();
  return Math.max(0, Math.round((end - start) / 86400000));
}

function averageVisitGap(dates: string[]) {
  if (dates.length < 2) return null;

  const gaps = dates
    .slice(1)
    .map((date, index) => dateDiffDays(dates[index], date));
  if (!gaps.length) return null;

  return Math.round(gaps.reduce((sum, value) => sum + value, 0) / gaps.length);
}

function priorityScore(priority: RetentionPriority) {
  if (priority === "high") return 3;
  if (priority === "medium") return 2;
  return 1;
}

function reasonTieBreak(reason: RetentionReasonCode) {
  if (reason === "overdue_cadence") return 4;
  if (reason === "inactive_client") return 3;
  if (reason === "attendance_risk") return 2;
  return 1;
}

function makeSignalKey(args: {
  reason: RetentionReasonCode;
  clientId: string;
  lastCompleted: string | null;
  completedCount: number;
  cancelledCount: number;
  noShowCount: number;
}) {
  const activityKey =
    args.reason === "attendance_risk"
      ? `${args.cancelledCount}-${args.noShowCount}`
      : String(args.completedCount);

  return [
    args.reason,
    args.clientId,
    args.lastCompleted ?? "none",
    activityKey,
  ].join(":");
}

function isSuppressed(action: RetentionRawAction | undefined, today: string) {
  if (!action) return false;
  if (
    action.action === "contacted" ||
    action.action === "resolved" ||
    action.action === "ignored"
  ) {
    return true;
  }

  return Boolean(
    action.action === "snoozed" &&
      action.snoozed_until &&
      action.snoozed_until >= today,
  );
}

export function deriveRetentionOverview(args: {
  clients: RetentionRawClient[];
  appointments: RetentionRawAppointment[];
  actions: RetentionRawAction[];
  today: string;
}): RetentionOverview {
  const { clients, appointments, actions, today } = args;
  const appointmentsByClient = new Map<string, RetentionRawAppointment[]>();

  for (const appointment of appointments) {
    if (!appointment.client_id) continue;
    const rows = appointmentsByClient.get(appointment.client_id) ?? [];
    rows.push(appointment);
    appointmentsByClient.set(appointment.client_id, rows);
  }

  const latestActionBySignal = new Map<string, RetentionRawAction>();
  for (const action of actions) {
    if (!latestActionBySignal.has(action.signal_key)) {
      latestActionBySignal.set(action.signal_key, action);
    }
  }

  const candidates: RetentionCandidate[] = [];

  for (const client of clients) {
    const rows = appointmentsByClient.get(client.id) ?? [];
    const completedRows = rows.filter((row) => row.status === "completed");
    const completedDates = [
      ...new Set(completedRows.map((row) => row.appointment_date)),
    ].sort();
    const lastCompleted = completedDates.at(-1) ?? null;
    const completedCount = completedRows.length;
    const averageDaysBetweenVisits = averageVisitGap(completedDates);
    const daysSinceLastVisit = lastCompleted
      ? dateDiffDays(lastCompleted, today)
      : null;

    const hasFutureBooking = rows.some(
      (row) =>
        row.appointment_date >= today &&
        (row.status === "scheduled" || row.status === "confirmed"),
    );
    if (hasFutureBooking) continue;

    const cancelledCount = rows.filter(
      (row) => row.status === "cancelled",
    ).length;
    const noShowCount = rows.filter((row) => row.status === "no_show").length;
    const resolvedCount = rows.filter((row) =>
      ["completed", "cancelled", "no_show"].includes(row.status),
    ).length;
    const noShowRate = resolvedCount
      ? Math.round((noShowCount / resolvedCount) * 100)
      : 0;
    const cancellationRate = resolvedCount
      ? Math.round((cancelledCount / resolvedCount) * 100)
      : 0;

    const reasons: Array<{
      reasonCode: RetentionReasonCode;
      priority: RetentionPriority;
    }> = [];

    if (
      lastCompleted &&
      averageDaysBetweenVisits !== null &&
      completedDates.length >= 2 &&
      daysSinceLastVisit !== null
    ) {
      const cadenceThreshold = Math.max(
        30,
        Math.round(averageDaysBetweenVisits * 1.5),
        averageDaysBetweenVisits + 14,
      );

      if (daysSinceLastVisit > cadenceThreshold) {
        const highThreshold = Math.max(
          cadenceThreshold + 30,
          averageDaysBetweenVisits * 2,
        );
        reasons.push({
          reasonCode: "overdue_cadence",
          priority: daysSinceLastVisit >= highThreshold ? "high" : "medium",
        });
      }
    }

    if (
      lastCompleted &&
      daysSinceLastVisit !== null &&
      daysSinceLastVisit > 120
    ) {
      reasons.push({
        reasonCode: "inactive_client",
        priority: daysSinceLastVisit > 180 ? "high" : "medium",
      });
    }

    if (
      completedCount >= 2 &&
      lastCompleted &&
      daysSinceLastVisit !== null &&
      daysSinceLastVisit >= 30
    ) {
      reasons.push({
        reasonCode: "no_future_booking",
        priority: daysSinceLastVisit >= 60 ? "medium" : "low",
      });
    }

    if (
      noShowCount >= 2 ||
      cancelledCount >= 2 ||
      (resolvedCount >= 2 && (noShowRate >= 25 || cancellationRate >= 25))
    ) {
      reasons.push({
        reasonCode: "attendance_risk",
        priority:
          noShowCount >= 2 || noShowRate >= 40 ? "high" : "medium",
      });
    }

    const strongest = reasons.sort((a, b) => {
      const priorityDelta = priorityScore(b.priority) - priorityScore(a.priority);
      if (priorityDelta !== 0) return priorityDelta;
      return reasonTieBreak(b.reasonCode) - reasonTieBreak(a.reasonCode);
    })[0];

    if (!strongest) continue;

    const signalKey = makeSignalKey({
      reason: strongest.reasonCode,
      clientId: client.id,
      lastCompleted,
      completedCount,
      cancelledCount,
      noShowCount,
    });

    if (isSuppressed(latestActionBySignal.get(signalKey), today)) continue;

    candidates.push({
      clientId: client.id,
      fullName: fullName(client),
      phone: client.phone,
      email: client.email,
      marketingEmailStatus:
        client.marketing_email_status === "allowed" ||
        client.marketing_email_status === "not_allowed"
          ? client.marketing_email_status
          : "unknown",
      signalKey,
      reasonCode: strongest.reasonCode,
      priority: strongest.priority,
      completedCount,
      lastCompleted,
      daysSinceLastVisit,
      averageDaysBetweenVisits,
      cancelledCount,
      noShowCount,
      noShowRate,
      cancellationRate,
    });
  }

  candidates.sort((a, b) => {
    const priorityDelta = priorityScore(b.priority) - priorityScore(a.priority);
    if (priorityDelta !== 0) return priorityDelta;
    return (b.daysSinceLastVisit ?? 0) - (a.daysSinceLastVisit ?? 0);
  });

  const clientNames = new Map(
    clients.map((client) => [client.id, fullName(client)]),
  );
  const history: RetentionHistoryItem[] = actions.slice(0, 40).map((action) => ({
    id: action.id,
    clientId: action.client_id,
    clientName: clientNames.get(action.client_id) ?? "Klijent",
    reasonCode: action.reason_code,
    action: action.action,
    snoozedUntil: action.snoozed_until,
    createdAt: action.created_at,
  }));

  const activeSnoozedSignals = new Set(
    actions
      .filter(
        (action) =>
          action.action === "snoozed" &&
          action.snoozed_until !== null &&
          action.snoozed_until >= today &&
          latestActionBySignal.get(action.signal_key)?.id === action.id,
      )
      .map((action) => action.signal_key),
  );

  return {
    candidates,
    history,
    stats: {
      total: candidates.length,
      high: candidates.filter((candidate) => candidate.priority === "high").length,
      medium: candidates.filter((candidate) => candidate.priority === "medium").length,
      low: candidates.filter((candidate) => candidate.priority === "low").length,
      snoozed: activeSnoozedSignals.size,
    },
  };
}
