export type ClientMatchRecord = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  marketing_email_status: "unknown" | "allowed" | "not_allowed";
};

export type ClientMatchResult =
  | {
      kind: "matched";
      matchedBy: "email" | "phone";
      client: ClientMatchRecord;
    }
  | {
      kind: "ambiguous";
      matchedBy: "email" | "phone";
      matches: ClientMatchRecord[];
    }
  | {
      kind: "none";
      reason?: "phone_email_conflict";
    };

export function normalizeClientEmail(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase() ?? "";
  return normalized || null;
}

export function normalizeClientPhone(value: string | null | undefined) {
  const normalized = value?.replace(/\D/g, "") ?? "";

  // Very short digit sequences are too weak to use as identity signals.
  return normalized.length >= 7 ? normalized : null;
}

export function findExistingClientMatch(
  clients: ClientMatchRecord[],
  input: { email?: string | null; phone?: string | null },
): ClientMatchResult {
  const normalizedEmail = normalizeClientEmail(input.email);

  if (normalizedEmail) {
    const emailMatches = clients.filter(
      (client) => normalizeClientEmail(client.email) === normalizedEmail,
    );

    if (emailMatches.length === 1) {
      return {
        kind: "matched",
        matchedBy: "email",
        client: emailMatches[0],
      };
    }

    if (emailMatches.length > 1) {
      return {
        kind: "ambiguous",
        matchedBy: "email",
        matches: emailMatches,
      };
    }
  }

  const normalizedPhone = normalizeClientPhone(input.phone);
  if (!normalizedPhone) return { kind: "none" };

  const phoneMatches = clients.filter(
    (client) => normalizeClientPhone(client.phone) === normalizedPhone,
  );

  if (phoneMatches.length > 1) {
    return {
      kind: "ambiguous",
      matchedBy: "phone",
      matches: phoneMatches,
    };
  }

  if (phoneMatches.length === 1) {
    const client = phoneMatches[0];
    const existingEmail = normalizeClientEmail(client.email);

    // Public booking requires email. A shared/reused phone number must not link
    // a booking to a client that already has a different email address.
    if (
      existingEmail &&
      normalizedEmail &&
      existingEmail !== normalizedEmail
    ) {
      return { kind: "none", reason: "phone_email_conflict" };
    }

    return {
      kind: "matched",
      matchedBy: "phone",
      client,
    };
  }

  return { kind: "none" };
}
