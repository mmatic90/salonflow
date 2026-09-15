import { createManagedEmailProvider } from "@/lib/email/provider";

type TrialInviteLocale = "hr" | "en" | "it";

function managedFromAddress() {
  const explicit = process.env.SALONFLOW_EMAIL_FROM_ADDRESS?.trim();
  if (explicit) return explicit;

  const legacy = process.env.RESEND_FROM_EMAIL?.trim();
  if (legacy) {
    const match = legacy.match(/<([^<>]+)>/);
    return match?.[1]?.trim() || legacy;
  }

  return "onboarding@resend.dev";
}

function siteUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  if (process.env.NODE_ENV !== "production") return "http://localhost:3000";
  throw new Error("NEXT_PUBLIC_SITE_URL is required for trial activation links.");
}

function buildActivationLink(actionLink: string, locale: TrialInviteLocale) {
  try {
    const supabaseLink = new URL(actionLink);
    const tokenHash = supabaseLink.searchParams.get("token");
    if (!tokenHash) return actionLink;

    const activationUrl = new URL("/set-password", `${siteUrl()}/`);
    activationUrl.searchParams.set("token_hash", tokenHash);
    activationUrl.searchParams.set("type", "invite");
    activationUrl.searchParams.set("locale", locale);
    return activationUrl.toString();
  } catch {
    return actionLink;
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function copy(locale: TrialInviteLocale) {
  if (locale === "it") {
    return {
      subject: "Il tuo accesso di prova a SalonFlow è pronto",
      greeting: "Ciao",
      intro: (salonName: string) =>
        `Abbiamo preparato uno spazio SalonFlow privato per ${salonName}.`,
      trial:
        "Hai 14 giorni di prova con le funzionalità Pro attive. I dati del tuo salone restano separati dagli altri account.",
      demo:
        "Se sono presenti dati dimostrativi, puoi modificarli liberamente per provare calendario, clienti, prenotazioni, report e CRM.",
      cta: "Imposta la password e apri SalonFlow",
      security:
        "Questo link serve solo per attivare il tuo account. Se è scaduto, contatta il team SalonFlow per ricevere un nuovo invito.",
      footer: "SalonFlow · gestione quotidiana del salone in un unico posto",
    };
  }

  if (locale === "en") {
    return {
      subject: "Your SalonFlow trial access is ready",
      greeting: "Hi",
      intro: (salonName: string) =>
        `We prepared a private SalonFlow workspace for ${salonName}.`,
      trial:
        "You have a 14-day trial with Pro features enabled. Your salon data stays separated from other accounts.",
      demo:
        "If demo data is included, feel free to change it while exploring the calendar, clients, online booking, reports and CRM.",
      cta: "Set your password and open SalonFlow",
      security:
        "This link is only for activating your account. If it has expired, contact the SalonFlow team for a new invitation.",
      footer: "SalonFlow · everyday salon management in one place",
    };
  }

  return {
    subject: "Tvoj probni pristup SalonFlowu je spreman",
    greeting: "Pozdrav",
    intro: (salonName: string) =>
      `Pripremili smo privatni SalonFlow prostor za ${salonName}.`,
    trial:
      "Imaš 14 dana probnog razdoblja s uključenim Pro funkcionalnostima. Podaci tvog salona odvojeni su od drugih korisničkih računa.",
    demo:
      "Ako su uključeni demo podaci, slobodno ih mijenjaj dok isprobavaš kalendar, klijente, online rezervacije, izvještaje i CRM.",
    cta: "Postavi lozinku i otvori SalonFlow",
    security:
      "Ovaj link služi samo za aktivaciju računa. Ako je istekao, javi se SalonFlow timu kako bi dobio novu pozivnicu.",
    footer: "SalonFlow · svakodnevno upravljanje salonom na jednom mjestu",
  };
}

export async function sendPlatformTrialInvite(args: {
  to: string;
  ownerName: string;
  salonName: string;
  locale: TrialInviteLocale;
  actionLink: string;
  hasDemoData: boolean;
}) {
  const text = copy(args.locale);
  const ownerName = escapeHtml(args.ownerName.trim());
  const salonName = escapeHtml(args.salonName.trim());
  const actionLink = escapeHtml(buildActivationLink(args.actionLink, args.locale));
  const from = `SalonFlow <${managedFromAddress()}>`;
  const replyTo =
    process.env.SALONFLOW_EMAIL_DEFAULT_REPLY_TO?.trim() ||
    process.env.RESEND_REPLY_TO?.trim() ||
    undefined;

  const html = `
    <div style="margin:0;padding:32px 16px;background:#f6f6f4;font-family:Arial,sans-serif;color:#171717;">
      <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e7e5e4;border-radius:18px;padding:32px;">
        <div style="font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#78716c;margin-bottom:18px;">SalonFlow</div>
        <h1 style="font-size:26px;line-height:1.2;margin:0 0 18px;">${text.greeting} ${ownerName},</h1>
        <p style="font-size:16px;line-height:1.65;margin:0 0 14px;">${text.intro(salonName)}</p>
        <p style="font-size:16px;line-height:1.65;margin:0 0 14px;">${text.trial}</p>
        ${
          args.hasDemoData
            ? `<p style="font-size:16px;line-height:1.65;margin:0 0 24px;">${text.demo}</p>`
            : '<div style="height:10px"></div>'
        }
        <a href="${actionLink}" style="display:inline-block;background:#171717;color:#ffffff;text-decoration:none;font-weight:700;padding:13px 20px;border-radius:10px;margin:0 0 24px;">${text.cta}</a>
        <p style="font-size:13px;line-height:1.6;color:#78716c;margin:0 0 20px;">${text.security}</p>
        <div style="border-top:1px solid #e7e5e4;padding-top:18px;font-size:12px;color:#a8a29e;">${text.footer}</div>
      </div>
    </div>
  `;

  return createManagedEmailProvider().send({
    from,
    to: args.to,
    subject: text.subject,
    html,
    replyTo,
  });
}
