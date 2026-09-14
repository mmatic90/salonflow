import { sendManagedTenantEmail } from "@/lib/email/managed-email";
import type { RetentionReasonCode } from "@/features/retention/queries";

type Lang = "hr" | "en" | "it";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function copy(lang: Lang, reason: RetentionReasonCode, salonName: string) {
  if (lang === "en") {
    return {
      subject: `${salonName} — Ready for your next visit?`,
      title: "We'd love to see you again ✨",
      intro:
        reason === "overdue_cadence"
          ? "It looks like a little more time than usual has passed since your last visit."
          : reason === "inactive_client"
            ? "It's been a while since your last visit and we'd be happy to welcome you back."
            : reason === "attendance_risk"
              ? "Whenever the timing suits you, we're here to help you arrange your next visit."
              : "If you're thinking about your next visit, you can request a new appointment online.",
      cta: "Book an appointment",
      footer:
        "This is an optional marketing/retention email from the salon. Appointment confirmations and service messages are managed separately.",
      unsubscribePrefix: "Don't want to receive these emails?",
      unsubscribe: "Unsubscribe",
    };
  }

  if (lang === "it") {
    return {
      subject: `${salonName} — Pronto/a per il prossimo appuntamento?`,
      title: "Ci farebbe piacere rivederti ✨",
      intro:
        reason === "overdue_cadence"
          ? "Sembra sia passato un po' più tempo del solito dall'ultima visita."
          : reason === "inactive_client"
            ? "È passato un po' di tempo dall'ultima visita e saremo felici di accoglierti di nuovo."
            : reason === "attendance_risk"
              ? "Quando sarà il momento giusto per te, siamo qui per aiutarti a organizzare la prossima visita."
              : "Se stai pensando al prossimo appuntamento, puoi inviare una nuova richiesta online.",
      cta: "Prenota un appuntamento",
      footer:
        "Questa è un'email facoltativa di marketing/retention del salone. Conferme appuntamento e comunicazioni di servizio sono gestite separatamente.",
      unsubscribePrefix: "Non vuoi più ricevere queste email?",
      unsubscribe: "Disiscriviti",
    };
  }

  return {
    subject: `${salonName} — Vrijeme je za novi posjet?`,
    title: "Rado bismo vas ponovno vidjeli ✨",
    intro:
      reason === "overdue_cadence"
        ? "Čini se da je od vašeg zadnjeg posjeta prošlo malo više vremena nego inače."
        : reason === "inactive_client"
          ? "Dugo se nismo vidjeli i rado bismo vas ponovno ugostili."
          : reason === "attendance_risk"
            ? "Kada vam bude odgovaralo, tu smo da vam pomognemo dogovoriti sljedeći posjet."
            : "Ako razmišljate o sljedećem terminu, novi zahtjev možete poslati online.",
    cta: "Rezerviraj termin",
    footer:
      "Ovo je opcionalni marketinški/retention email salona. Potvrde termina i ostale servisne poruke vode se odvojeno.",
    unsubscribePrefix: "Ne želite primati ovakve poruke?",
    unsubscribe: "Odjavite se",
  };
}

export async function sendRetentionFollowupEmail(args: {
  organizationId: string;
  to: string;
  clientName: string;
  salonName: string;
  salonPhone?: string | null;
  salonAddress?: string | null;
  salonLogoUrl?: string | null;
  bookingUrl: string;
  unsubscribeUrl: string;
  reasonCode: RetentionReasonCode;
  lang: Lang;
}) {
  const t = copy(args.lang, args.reasonCode, args.salonName);
  const salonName = escapeHtml(args.salonName);
  const clientName = escapeHtml(args.clientName);
  const bookingUrl = escapeHtml(args.bookingUrl);
  const unsubscribeUrl = escapeHtml(args.unsubscribeUrl);
  const phone = args.salonPhone?.trim() ? escapeHtml(args.salonPhone.trim()) : "";
  const address = args.salonAddress?.trim() ? escapeHtml(args.salonAddress.trim()) : "";
  const logo = args.salonLogoUrl?.trim() ? escapeHtml(args.salonLogoUrl.trim()) : "";

  const html = `
  <div style="margin:0;padding:0;background:#f8f3ef;font-family:Arial,Helvetica,sans-serif;color:#2f2723;">
    <div style="max-width:640px;margin:0 auto;padding:32px 16px;">
      <div style="overflow:hidden;border:1px solid #eadbd2;border-radius:28px;background:#ffffff;box-shadow:0 12px 32px rgba(47,39,35,0.08);">
        <div style="background:#2f2723;padding:32px 28px;text-align:center;color:#ffffff;">
          ${logo ? `<img src="${logo}" alt="${salonName}" style="display:block;max-width:150px;height:auto;margin:0 auto 16px;" />` : `<div style="font-size:26px;font-weight:700;">${salonName}</div>`}
          <div style="font-size:13px;letter-spacing:0.28em;text-transform:uppercase;color:#eadbd2;">SalonFlow</div>
        </div>
        <div style="padding:34px 30px;">
          <p style="margin:0 0 10px;font-size:15px;color:#6f5a50;">${args.lang === "it" ? "Ciao" : args.lang === "en" ? "Hi" : "Bok"} ${clientName},</p>
          <h1 style="margin:0 0 14px;font-size:28px;line-height:1.25;color:#2f2723;">${escapeHtml(t.title)}</h1>
          <p style="margin:0 0 24px;font-size:16px;line-height:1.7;color:#6f5a50;">${escapeHtml(t.intro)}</p>
          <p style="margin:0 0 26px;">
            <a href="${bookingUrl}" style="display:inline-block;border-radius:12px;background:#2f2723;padding:13px 20px;color:#ffffff;text-decoration:none;font-weight:700;">${escapeHtml(t.cta)}</a>
          </p>
          <p style="margin:0;font-size:13px;line-height:1.7;color:#8a756b;">${escapeHtml(t.footer)}</p>
        </div>
        <div style="background:#f8f3ef;padding:24px 30px;text-align:center;font-size:13px;line-height:1.7;color:#6f5a50;">
          <div style="font-weight:700;color:#2f2723;">${salonName}</div>
          ${address ? `<div>${address}</div>` : ""}
          ${phone ? `<div>${phone}</div>` : ""}
          <div style="margin-top:14px;font-size:12px;">
            ${escapeHtml(t.unsubscribePrefix)}
            <a href="${unsubscribeUrl}" style="color:#6f5a50;text-decoration:underline;">${escapeHtml(t.unsubscribe)}</a>
          </div>
        </div>
      </div>
    </div>
  </div>`;

  return sendManagedTenantEmail({
    organizationId: args.organizationId,
    capability: "advanced_crm",
    to: args.to,
    subject: t.subject,
    html,
    displayName: args.salonName,
  });
}
