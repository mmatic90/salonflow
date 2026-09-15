import { sendManagedTenantEmail } from "@/lib/email/managed-email";

type NotificationLang = "hr" | "en" | "it";

type BrandingArgs = {
  organizationId: string;
  salonName?: string;
  salonPhone?: string | null;
  salonAddress?: string | null;
  salonLogoUrl?: string | null;
  to: string;
  lang?: NotificationLang;
};

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
  lang: NotificationLang,
  branding: {
    salonName?: string;
    phone?: string | null;
    address?: string | null;
    logoUrl?: string | null;
  },
) {
  const salonName = branding.salonName?.trim() || "Salon";
  const phone = branding.phone?.trim() || "";
  const address = branding.address?.trim() || "";
  const logoUrl = branding.logoUrl?.trim() || "";
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
            logoUrl
              ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(salonName)}" style="max-width:150px;height:auto;margin:0 auto 16px;display:block;" />`
              : `<div style="font-size:26px;font-weight:700;letter-spacing:0.02em;">${escapeHtml(salonName)}</div>`
          }
          <div style="font-size:13px;letter-spacing:0.28em;text-transform:uppercase;color:#eadbd2;">SalonFlow</div>
        </div>
        <div style="padding:34px 30px;">${content}</div>
        <div style="background:#f8f3ef;padding:24px 30px;text-align:center;font-size:13px;line-height:1.7;color:#6f5a50;">
          <div style="font-weight:700;color:#2f2723;">${escapeHtml(salonName)}</div>
          ${address ? `<div>${escapeHtml(address)}</div>` : ""}
          ${phone ? `<div>${escapeHtml(phone)}</div>` : ""}
          <div style="margin-top:10px;">${footerText}</div>
          <div style="margin-top:12px;font-size:12px;color:#9b6f5b;">© ${new Date().getFullYear()} ${escapeHtml(salonName)}</div>
        </div>
      </div>
    </div>
  </div>`;
}

function detailsBox(rows: Array<[string, string]>) {
  return `<div style="margin:24px 0;padding:22px;border-radius:20px;background:#f8f3ef;border:1px solid #eadbd2;">
    ${rows
      .map(
        ([label, value], index) =>
          `<p style="margin:0${index === rows.length - 1 ? "" : " 0 10px"};"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`,
      )
      .join("")}
  </div>`;
}

export async function sendBookingAcceptedEmail(
  args: BrandingArgs & {
    serviceName: string;
    date: string;
    time: string;
  },
) {
  const lang = args.lang ?? "en";
  const salonName = args.salonName?.trim() || "Salon";
  const copy =
    lang === "hr"
      ? {
          title: "Vaš termin je potvrđen ✨",
          intro: `Hvala na rezervaciji. Vaš termin u salonu ${salonName} je potvrđen.`,
          service: "Usluga",
          date: "Datum",
          time: "Vrijeme",
          footer: "Ako niste u mogućnosti doći, molimo vas da kontaktirate salon na vrijeme.",
          subject: `${salonName} — Termin potvrđen`,
        }
      : lang === "it"
        ? {
            title: "Il tuo appuntamento è confermato ✨",
            intro: `Grazie per la prenotazione. Il tuo appuntamento presso ${salonName} è stato confermato.`,
            service: "Servizio",
            date: "Data",
            time: "Ora",
            footer: "Se non puoi presentarti, contatta il salone in anticipo.",
            subject: `${salonName} — Appuntamento confermato`,
          }
        : {
            title: "Your appointment is confirmed ✨",
            intro: `Thank you for your booking. Your appointment at ${salonName} has been confirmed.`,
            service: "Service",
            date: "Date",
            time: "Time",
            footer: "If you cannot attend, please contact the salon in advance.",
            subject: `${salonName} — Appointment confirmed`,
          };

  const content = `
    <h1 style="margin:0 0 14px;font-size:28px;line-height:1.25;color:#2f2723;">${escapeHtml(copy.title)}</h1>
    <p style="margin:0 0 22px;font-size:16px;line-height:1.7;color:#6f5a50;">${escapeHtml(copy.intro)}</p>
    ${detailsBox([
      [copy.service, args.serviceName],
      [copy.date, args.date],
      [copy.time, args.time],
    ])}
    <p style="margin:0;font-size:15px;line-height:1.7;color:#6f5a50;">${escapeHtml(copy.footer)}</p>`;

  return sendManagedTenantEmail({
    organizationId: args.organizationId,
    capability: "booking_notifications",
    to: args.to,
    subject: copy.subject,
    html: layout(content, lang, {
      salonName: args.salonName,
      phone: args.salonPhone,
      address: args.salonAddress,
      logoUrl: args.salonLogoUrl,
    }),
    displayName: salonName,
  });
}

export async function sendBookingRejectedEmail(
  args: BrandingArgs & {
    serviceName: string;
    date: string;
    time: string;
    reason: string;
  },
) {
  const lang = args.lang ?? "en";
  const salonName = args.salonName?.trim() || "Salon";
  const copy =
    lang === "hr"
      ? {
          title: "Zahtjev nije moguće potvrditi",
          intro: "Nažalost, vaš zahtjev za termin nije moguće potvrditi.",
          service: "Usluga",
          date: "Datum",
          time: "Vrijeme",
          reason: "Razlog",
          footer: "Za dogovor novog termina kontaktirajte salon direktno.",
          subject: `${salonName} — Zahtjev za termin`,
        }
      : lang === "it"
        ? {
            title: "La richiesta di prenotazione è stata rifiutata",
            intro: "Purtroppo non è stato possibile confermare la tua richiesta di appuntamento.",
            service: "Servizio",
            date: "Data",
            time: "Ora",
            reason: "Motivo",
            footer: "Contatta direttamente il salone per concordare un altro appuntamento.",
            subject: `${salonName} — Aggiornamento prenotazione`,
          }
        : {
            title: "Your booking request was declined",
            intro: "Unfortunately, your appointment request could not be confirmed.",
            service: "Service",
            date: "Date",
            time: "Time",
            reason: "Reason",
            footer: "Please contact the salon directly to arrange another appointment.",
            subject: `${salonName} — Booking request update`,
          };

  const content = `
    <h1 style="margin:0 0 14px;font-size:28px;line-height:1.25;color:#2f2723;">${escapeHtml(copy.title)}</h1>
    <p style="margin:0 0 22px;font-size:16px;line-height:1.7;color:#6f5a50;">${escapeHtml(copy.intro)}</p>
    ${detailsBox([
      [copy.service, args.serviceName],
      [copy.date, args.date],
      [copy.time, args.time],
      [copy.reason, args.reason],
    ])}
    <p style="margin:0;font-size:15px;line-height:1.7;color:#6f5a50;">${escapeHtml(copy.footer)}</p>`;

  return sendManagedTenantEmail({
    organizationId: args.organizationId,
    capability: "booking_notifications",
    to: args.to,
    subject: copy.subject,
    html: layout(content, lang, {
      salonName: args.salonName,
      phone: args.salonPhone,
      address: args.salonAddress,
      logoUrl: args.salonLogoUrl,
    }),
    displayName: salonName,
  });
}

export async function sendAppointmentReminderEmail(
  args: BrandingArgs & {
    clientName: string;
    date: string;
    time: string;
    serviceName?: string | null;
  },
) {
  const lang = args.lang ?? "en";
  const salonName = args.salonName?.trim() || "Salon";
  const copy =
    lang === "hr"
      ? {
          title: "Podsjetnik za vaš termin",
          intro: `Bok ${args.clientName}, podsjećamo vas na termin u salonu ${salonName}.`,
          service: "Usluga",
          date: "Datum",
          time: "Vrijeme",
          footer: "Ako niste u mogućnosti doći, molimo vas da kontaktirate salon na vrijeme.",
          subject: `${salonName} — Podsjetnik za termin`,
        }
      : lang === "it"
        ? {
            title: "Promemoria appuntamento",
            intro: `Ciao ${args.clientName}, ti ricordiamo il tuo appuntamento presso ${salonName}.`,
            service: "Servizio",
            date: "Data",
            time: "Ora",
            footer: "Se non puoi presentarti, contatta il salone in anticipo.",
            subject: `${salonName} — Promemoria appuntamento`,
          }
        : {
            title: "Appointment reminder",
            intro: `Hi ${args.clientName}, this is a reminder for your appointment at ${salonName}.`,
            service: "Service",
            date: "Date",
            time: "Time",
            footer: "If you cannot attend, please contact the salon in advance.",
            subject: `${salonName} — Appointment reminder`,
          };

  const rows: Array<[string, string]> = [];
  if (args.serviceName?.trim()) rows.push([copy.service, args.serviceName.trim()]);
  rows.push([copy.date, args.date], [copy.time, args.time]);

  const content = `
    <h1 style="margin:0 0 14px;font-size:28px;line-height:1.25;color:#2f2723;">${escapeHtml(copy.title)}</h1>
    <p style="margin:0 0 22px;font-size:16px;line-height:1.7;color:#6f5a50;">${escapeHtml(copy.intro)}</p>
    ${detailsBox(rows)}
    <p style="margin:0;font-size:15px;line-height:1.7;color:#6f5a50;">${escapeHtml(copy.footer)}</p>`;

  return sendManagedTenantEmail({
    organizationId: args.organizationId,
    capability: "appointment_reminders",
    to: args.to,
    subject: copy.subject,
    html: layout(content, lang, {
      salonName: args.salonName,
      phone: args.salonPhone,
      address: args.salonAddress,
      logoUrl: args.salonLogoUrl,
    }),
    displayName: salonName,
  });
}
