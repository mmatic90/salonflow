import { Resend } from "resend";

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is missing");
  }

  return new Resend(apiKey);
}

const fromEmail =
  process.env.RESEND_FROM_EMAIL || "SalonFlow <onboarding@resend.dev>";

const replyTo = process.env.RESEND_REPLY_TO || undefined;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function layout(
  content: string,
  lang: "hr" | "en" | "it",
  branding?: {
    salonName?: string;
    phone?: string | null;
    address?: string | null;
    logoUrl?: string | null;
  },
) {
  const salonName = branding?.salonName?.trim() || "Salon";
  const phone = branding?.phone?.trim() || "";
  const address = branding?.address?.trim() || "";
  const resolvedLogoUrl = branding?.logoUrl?.trim() || "";

  const footerText =
    lang === "en"
      ? "If you have any questions, please contact the salon directly."
      : lang === "it"
        ? "Per qualsiasi domanda, contatta direttamente il salone."
        : "Za sva pitanja kontaktirajte salon direktno.";

  return `
  <div style="margin:0;padding:0;background:#f8f3ef;font-family:Arial,Helvetica,sans-serif;color:#2f2723;">
    <div style="max-width:640px;margin:0 auto;padding:32px 16px;">
      <div style="background:#ffffff;border-radius:28px;overflow:hidden;border:1px solid #eadbd2;box-shadow:0 12px 32px rgba(47,39,35,0.08);">
        <div style="background:#2f2723;padding:32px 28px;text-align:center;color:#ffffff;">
          ${
            resolvedLogoUrl
              ? `<img src="${escapeHtml(resolvedLogoUrl)}" alt="${escapeHtml(salonName)}" style="max-width:150px;height:auto;margin:0 auto 16px;display:block;" />`
              : `<div style="font-size:26px;font-weight:700;letter-spacing:0.02em;">${escapeHtml(salonName)}</div>`
          }
          <div style="font-size:13px;letter-spacing:0.28em;text-transform:uppercase;color:#eadbd2;">
            SalonFlow
          </div>
        </div>

        <div style="padding:34px 30px;">
          ${content}
        </div>

        <div style="background:#f8f3ef;padding:24px 30px;text-align:center;font-size:13px;line-height:1.7;color:#6f5a50;">
          <div style="font-weight:700;color:#2f2723;">${escapeHtml(salonName)}</div>
          ${address ? `<div>${escapeHtml(address)}</div>` : ""}
          ${phone ? `<div>${escapeHtml(phone)}</div>` : ""}
          <div style="margin-top:10px;">${footerText}</div>
          <div style="margin-top:12px;font-size:12px;color:#9b6f5b;">
            © ${new Date().getFullYear()} ${escapeHtml(salonName)}
          </div>
        </div>
      </div>
    </div>
  </div>
  `;
}

export async function sendBookingAcceptedEmail(args: {
  salonName?: string;
  salonPhone?: string | null;
  salonAddress?: string | null;
  salonLogoUrl?: string | null;
  to: string;
  serviceName: string;
  date: string;
  time: string;
  lang?: "hr" | "en" | "it";
}) {
  const lang = args.lang ?? "en";
  const isHr = lang === "hr";
  const isIt = lang === "it";

  const content = isHr
    ? `
      <h1 style="margin:0 0 14px;font-size:28px;line-height:1.25;color:#2f2723;">Vaš termin je potvrđen ✨</h1>
      <p style="margin:0 0 22px;font-size:16px;line-height:1.7;color:#6f5a50;">
        Hvala na rezervaciji. Vaš termin u salonu ${escapeHtml(args.salonName?.trim() || "Salon")} je potvrđen.
      </p>
      <div style="margin:24px 0;padding:22px;border-radius:20px;background:#f8f3ef;border:1px solid #eadbd2;">
        <p style="margin:0 0 10px;"><strong>Usluga:</strong> ${escapeHtml(args.serviceName)}</p>
        <p style="margin:0 0 10px;"><strong>Datum:</strong> ${escapeHtml(args.date)}</p>
        <p style="margin:0;"><strong>Vrijeme:</strong> ${escapeHtml(args.time)}</p>
      </div>
      <p style="margin:0;font-size:15px;line-height:1.7;color:#6f5a50;">
        Ako niste u mogućnosti doći, molimo vas da kontaktirate salon na vrijeme.
      </p>
    `
    : isIt
      ? `
      <h1 style="margin:0 0 14px;font-size:28px;line-height:1.25;color:#2f2723;">Il tuo appuntamento è confermato ✨</h1>
      <p style="margin:0 0 22px;font-size:16px;line-height:1.7;color:#6f5a50;">
        Grazie per la prenotazione. Il tuo appuntamento presso ${escapeHtml(args.salonName?.trim() || "Salon")} è stato confermato.
      </p>
      <div style="margin:24px 0;padding:22px;border-radius:20px;background:#f8f3ef;border:1px solid #eadbd2;">
        <p style="margin:0 0 10px;"><strong>Servizio:</strong> ${escapeHtml(args.serviceName)}</p>
        <p style="margin:0 0 10px;"><strong>Data:</strong> ${escapeHtml(args.date)}</p>
        <p style="margin:0;"><strong>Ora:</strong> ${escapeHtml(args.time)}</p>
      </div>
      <p style="margin:0;font-size:15px;line-height:1.7;color:#6f5a50;">
        Se non puoi presentarti, contatta il salone in anticipo.
      </p>
    `
    : `
      <h1 style="margin:0 0 14px;font-size:28px;line-height:1.25;color:#2f2723;">Your appointment is confirmed ✨</h1>
      <p style="margin:0 0 22px;font-size:16px;line-height:1.7;color:#6f5a50;">
        Thank you for your booking. Your appointment at ${escapeHtml(args.salonName?.trim() || "Salon")} has been confirmed.
      </p>
      <div style="margin:24px 0;padding:22px;border-radius:20px;background:#f8f3ef;border:1px solid #eadbd2;">
        <p style="margin:0 0 10px;"><strong>Service:</strong> ${escapeHtml(args.serviceName)}</p>
        <p style="margin:0 0 10px;"><strong>Date:</strong> ${escapeHtml(args.date)}</p>
        <p style="margin:0;"><strong>Time:</strong> ${escapeHtml(args.time)}</p>
      </div>
      <p style="margin:0;font-size:15px;line-height:1.7;color:#6f5a50;">
        If you cannot attend, please contact the salon in advance.
      </p>
    `;

  const { error } = await getResend().emails.send({
    from: fromEmail,
    to: [args.to],
    subject: isHr
      ? `${args.salonName?.trim() || "Salon"} — Termin potvrđen`
      : isIt
        ? `${args.salonName?.trim() || "Salon"} — Appuntamento confermato`
        : `${args.salonName?.trim() || "Salon"} — Appointment confirmed`,
    html: layout(content, lang, {
      salonName: args.salonName,
      phone: args.salonPhone,
      address: args.salonAddress,
      logoUrl: args.salonLogoUrl,
    }),
    replyTo,
  });

  if (error) throw new Error(error.message);
}

export async function sendBookingRejectedEmail(args: {
  salonName?: string;
  salonPhone?: string | null;
  salonAddress?: string | null;
  salonLogoUrl?: string | null;
  to: string;
  serviceName: string;
  date: string;
  time: string;
  reason: string;
  lang?: "hr" | "en" | "it";
}) {
  const lang = args.lang ?? "en";
  const isHr = lang === "hr";
  const isIt = lang === "it";

  const content = isHr
    ? `
      <h1 style="margin:0 0 14px;font-size:28px;line-height:1.25;color:#2f2723;">Zahtjev nije moguće potvrditi</h1>
      <p style="margin:0 0 22px;font-size:16px;line-height:1.7;color:#6f5a50;">
        Nažalost, vaš zahtjev za termin nije moguće potvrditi.
      </p>
      <div style="margin:24px 0;padding:22px;border-radius:20px;background:#f8f3ef;border:1px solid #eadbd2;">
        <p style="margin:0 0 10px;"><strong>Usluga:</strong> ${escapeHtml(args.serviceName)}</p>
        <p style="margin:0 0 10px;"><strong>Datum:</strong> ${escapeHtml(args.date)}</p>
        <p style="margin:0 0 10px;"><strong>Vrijeme:</strong> ${escapeHtml(args.time)}</p>
        <p style="margin:0;"><strong>Razlog:</strong> ${escapeHtml(args.reason)}</p>
      </div>
      <p style="margin:0;font-size:15px;line-height:1.7;color:#6f5a50;">
        Za dogovor novog termina kontaktirajte salon direktno.
      </p>
    `
    : isIt
      ? `
      <h1 style="margin:0 0 14px;font-size:28px;line-height:1.25;color:#2f2723;">La richiesta di prenotazione è stata rifiutata</h1>
      <p style="margin:0 0 22px;font-size:16px;line-height:1.7;color:#6f5a50;">
        Purtroppo non è stato possibile confermare la tua richiesta di appuntamento.
      </p>
      <div style="margin:24px 0;padding:22px;border-radius:20px;background:#f8f3ef;border:1px solid #eadbd2;">
        <p style="margin:0 0 10px;"><strong>Servizio:</strong> ${escapeHtml(args.serviceName)}</p>
        <p style="margin:0 0 10px;"><strong>Data:</strong> ${escapeHtml(args.date)}</p>
        <p style="margin:0 0 10px;"><strong>Ora:</strong> ${escapeHtml(args.time)}</p>
        <p style="margin:0;"><strong>Motivo:</strong> ${escapeHtml(args.reason)}</p>
      </div>
      <p style="margin:0;font-size:15px;line-height:1.7;color:#6f5a50;">
        Contatta direttamente il salone per concordare un altro appuntamento.
      </p>
    `
    : `
      <h1 style="margin:0 0 14px;font-size:28px;line-height:1.25;color:#2f2723;">Your booking request was declined</h1>
      <p style="margin:0 0 22px;font-size:16px;line-height:1.7;color:#6f5a50;">
        Unfortunately, your appointment request could not be confirmed.
      </p>
      <div style="margin:24px 0;padding:22px;border-radius:20px;background:#f8f3ef;border:1px solid #eadbd2;">
        <p style="margin:0 0 10px;"><strong>Service:</strong> ${escapeHtml(args.serviceName)}</p>
        <p style="margin:0 0 10px;"><strong>Date:</strong> ${escapeHtml(args.date)}</p>
        <p style="margin:0 0 10px;"><strong>Time:</strong> ${escapeHtml(args.time)}</p>
        <p style="margin:0;"><strong>Reason:</strong> ${escapeHtml(args.reason)}</p>
      </div>
      <p style="margin:0;font-size:15px;line-height:1.7;color:#6f5a50;">
        Please contact the salon directly to arrange another appointment.
      </p>
    `;

  const { error } = await getResend().emails.send({
    from: fromEmail,
    to: [args.to],
    subject: isHr
      ? `${args.salonName?.trim() || "Salon"} — Zahtjev za termin`
      : isIt
        ? `${args.salonName?.trim() || "Salon"} — Aggiornamento prenotazione`
        : `${args.salonName?.trim() || "Salon"} — Booking request update`,
    html: layout(content, lang, {
      salonName: args.salonName,
      phone: args.salonPhone,
      address: args.salonAddress,
      logoUrl: args.salonLogoUrl,
    }),
    replyTo,
  });

  if (error) throw new Error(error.message);
}

export async function sendAppointmentReminderEmail(args: {
  salonName?: string;
  salonPhone?: string | null;
  salonAddress?: string | null;
  salonLogoUrl?: string | null;
  to: string;
  clientName: string;
  date: string;
  time: string;
  serviceName?: string | null;
  lang?: "hr" | "en" | "it";
}) {
  const lang = args.lang ?? "en";
  const isHr = lang === "hr";
  const serviceName = args.serviceName?.trim();

  const content = isHr
    ? `
      <h1 style="margin:0 0 14px;font-size:28px;line-height:1.25;color:#2f2723;">Podsjetnik za vaš termin</h1>
      <p style="margin:0 0 22px;font-size:16px;line-height:1.7;color:#6f5a50;">
        Bok ${escapeHtml(args.clientName)}, podsjećamo vas na termin u salonu ${escapeHtml(args.salonName?.trim() || "Salon")}.
      </p>
      <div style="margin:24px 0;padding:22px;border-radius:20px;background:#f8f3ef;border:1px solid #eadbd2;">
        ${serviceName ? `<p style="margin:0 0 10px;"><strong>Usluga:</strong> ${escapeHtml(serviceName)}</p>` : ""}
        <p style="margin:0 0 10px;"><strong>Datum:</strong> ${escapeHtml(args.date)}</p>
        <p style="margin:0;"><strong>Vrijeme:</strong> ${escapeHtml(args.time)}</p>
      </div>
      <p style="margin:0;font-size:15px;line-height:1.7;color:#6f5a50;">
        Ako niste u mogućnosti doći, molimo vas da kontaktirate salon na vrijeme.
      </p>
    `
    : `
      <h1 style="margin:0 0 14px;font-size:28px;line-height:1.25;color:#2f2723;">Appointment reminder</h1>
      <p style="margin:0 0 22px;font-size:16px;line-height:1.7;color:#6f5a50;">
        Hi ${escapeHtml(args.clientName)}, this is a reminder for your appointment at ${escapeHtml(args.salonName?.trim() || "Salon")}.
      </p>
      <div style="margin:24px 0;padding:22px;border-radius:20px;background:#f8f3ef;border:1px solid #eadbd2;">
        ${serviceName ? `<p style="margin:0 0 10px;"><strong>Service:</strong> ${escapeHtml(serviceName)}</p>` : ""}
        <p style="margin:0 0 10px;"><strong>Date:</strong> ${escapeHtml(args.date)}</p>
        <p style="margin:0;"><strong>Time:</strong> ${escapeHtml(args.time)}</p>
      </div>
      <p style="margin:0;font-size:15px;line-height:1.7;color:#6f5a50;">
        If you cannot attend, please contact the salon in advance.
      </p>
    `;

  const { error } = await getResend().emails.send({
    from: fromEmail,
    to: [args.to],
    subject: isHr
      ? `${args.salonName?.trim() || "Salon"} — Podsjetnik za termin`
      : `${args.salonName?.trim() || "Salon"} — Appointment reminder`,
    html: layout(content, lang, {
      salonName: args.salonName,
      phone: args.salonPhone,
      address: args.salonAddress,
      logoUrl: args.salonLogoUrl,
    }),
    replyTo,
  });

  if (error) throw new Error(error.message);
}

export async function sendGoogleReviewRequestEmail(args: {
  salonName?: string;
  salonPhone?: string | null;
  salonAddress?: string | null;
  salonLogoUrl?: string | null;
  to: string;
  clientName: string;
  reviewUrl: string;
  lang?: "hr" | "en" | "it";
}) {
  const lang = args.lang ?? "hr";
  const isHr = lang === "hr";

  const content = isHr
    ? `
      <h1 style="margin:0 0 14px;font-size:28px;line-height:1.25;color:#2f2723;">Hvala na dolasku ✨</h1>
      <p style="margin:0 0 22px;font-size:16px;line-height:1.7;color:#6f5a50;">
        Bok ${escapeHtml(args.clientName)}, hvala vam što ste posjetili ${escapeHtml(args.salonName?.trim() || "Salon")}.
      </p>

      <p style="margin:0 0 22px;font-size:16px;line-height:1.7;color:#6f5a50;">
        Ako ste zadovoljni tretmanom, jako bi nam značilo da ostavite kratku Google recenziju.
      </p>

      <a href="${escapeHtml(args.reviewUrl)}" style="display:inline-block;background:#2f2723;color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:14px;font-weight:700;">
        Ostavi Google recenziju
      </a>
    `
    : `
      <h1 style="margin:0 0 14px;font-size:28px;line-height:1.25;color:#2f2723;">Thank you for your visit ✨</h1>
      <p style="margin:0 0 22px;font-size:16px;line-height:1.7;color:#6f5a50;">
        Hi ${escapeHtml(args.clientName)}, thank you for visiting ${escapeHtml(args.salonName?.trim() || "Salon")}.
      </p>

      <p style="margin:0 0 22px;font-size:16px;line-height:1.7;color:#6f5a50;">
        If you were happy with your treatment, we would really appreciate a short Google review.
      </p>

      <a href="${escapeHtml(args.reviewUrl)}" style="display:inline-block;background:#2f2723;color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:14px;font-weight:700;">
        Leave a Google review
      </a>
    `;

  const { error } = await getResend().emails.send({
    from: fromEmail,
    to: [args.to],
    subject: isHr
      ? `${args.salonName?.trim() || "Salon"} — Hvala na dolasku`
      : `${args.salonName?.trim() || "Salon"} — Thank you for your visit`,
    html: layout(content, lang, {
      salonName: args.salonName,
      phone: args.salonPhone,
      address: args.salonAddress,
      logoUrl: args.salonLogoUrl,
    }),
    replyTo,
  });

  if (error) throw new Error(error.message);
}
