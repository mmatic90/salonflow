import { createManagedEmailProvider } from "@/lib/email/provider";
import { DEFAULT_TRIAL_DAYS } from "@/lib/plans";

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
      subject: "Il tuo accesso di prova a MiT Salon è pronto",
      greeting: "Ciao",
      intro: (salonName: string) =>
        `Abbiamo preparato uno spazio MiT Salon privato per ${salonName}.`,
      trial:
        `Hai ${DEFAULT_TRIAL_DAYS} giorni di prova con le funzionalità Pro attive. Alla scadenza l'accesso viene bloccato, ma i dati del salone restano salvati e separati dagli altri account.`,
      demo:
        "Se sono presenti dati dimostrativi, puoi modificarli liberamente per provare calendario, clienti, prenotazioni, report e CRM.",
      cta: "Imposta la password e apri MiT Salon",
      security:
        "Questo link serve solo per attivare il tuo account. Se è scaduto, contatta il team MiT Salon per ricevere un nuovo invito.",
      footer: "MiT Salon · gestione quotidiana del salone in un unico posto",
    };
  }

  if (locale === "en") {
    return {
      subject: "Your MiT Salon trial access is ready",
      greeting: "Hi",
      intro: (salonName: string) =>
        `We prepared a private MiT Salon workspace for ${salonName}.`,
      trial:
        `You have a ${DEFAULT_TRIAL_DAYS}-day trial with Pro features enabled. When the trial ends, access is locked while your salon data remains saved and separated from other accounts.`,
      demo:
        "If demo data is included, feel free to change it while exploring the calendar, clients, online booking, reports and CRM.",
      cta: "Set your password and open MiT Salon",
      security:
        "This link is only for activating your account. If it has expired, contact the MiT Salon team for a new invitation.",
      footer: "MiT Salon · everyday salon management in one place",
    };
  }

  return {
    subject: "Tvoj probni pristup MiT Salonu je spreman",
    greeting: "Pozdrav",
    intro: (salonName: string) =>
      `Pripremili smo privatni MiT Salon prostor za ${salonName}.`,
    trial:
      `Imaš ${DEFAULT_TRIAL_DAYS} dana probnog razdoblja s uključenim Pro funkcionalnostima. Nakon isteka pristup se zaključava, ali podaci salona ostaju sačuvani i odvojeni od drugih korisničkih računa.`,
    demo:
      "Ako su uključeni demo podaci, slobodno ih mijenjaj dok isprobavaš kalendar, klijente, online rezervacije, izvještaje i CRM.",
    cta: "Postavi lozinku i otvori MiT Salon",
    security:
      "Ovaj link služi samo za aktivaciju računa. Ako je istekao, javi se MiT Salon timu kako bi dobio novu pozivnicu.",
    footer: "MiT Salon · svakodnevno upravljanje salonom na jednom mjestu",
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
  const from = `MiT Salon <${managedFromAddress()}>`;
  const replyTo =
    process.env.SALONFLOW_EMAIL_DEFAULT_REPLY_TO?.trim() ||
    process.env.RESEND_REPLY_TO?.trim() ||
    undefined;

  const html = `
    <div style="margin:0;padding:32px 16px;background:#f6f6f4;font-family:Arial,sans-serif;color:#171717;">
      <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e7e5e4;border-radius:18px;padding:32px;">
        <div style="font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#78716c;margin-bottom:18px;">MiT Salon</div>
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
