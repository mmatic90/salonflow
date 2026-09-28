import { sendManagedTenantEmail } from "@/lib/email/managed-email";

type ReviewRequestEmailArgs = {
  organizationId: string;
  salonName?: string;
  salonPhone?: string | null;
  salonAddress?: string | null;
  salonLogoUrl?: string | null;
  to: string;
  clientName: string;
  reviewUrl: string;
  lang?: "hr" | "en" | "it";
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
  lang: "hr" | "en" | "it",
  args: ReviewRequestEmailArgs,
) {
  const salonName = args.salonName?.trim() || "Salon";
  const address = args.salonAddress?.trim() || "";
  const phone = args.salonPhone?.trim() || "";
  const logoUrl = args.salonLogoUrl?.trim() || "";
  const footer =
    lang === "en"
      ? "If you have any questions, please contact the salon directly."
      : lang === "it"
        ? "Per qualsiasi domanda, contatta direttamente il salone."
        : "Za sva pitanja kontaktirajte salon direktno.";

  return `
  <div style="margin:0;padding:0;background:#f8f3ef;font-family:Arial,Helvetica,sans-serif;color:#2f2723;">
    <div style="max-width:640px;margin:0 auto;padding:32px 16px;">
      <div style="overflow:hidden;border:1px solid #eadbd2;border-radius:28px;background:#ffffff;box-shadow:0 12px 32px rgba(47,39,35,0.08);">
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
          <div style="margin-top:10px;">${footer}</div>
        </div>
      </div>
    </div>
  </div>`;
}

export async function sendGoogleReviewRequestEmail(args: ReviewRequestEmailArgs) {
  const lang = args.lang ?? "hr";
  const salonName = args.salonName?.trim() || "Salon";

  const copy =
    lang === "en"
      ? {
          title: "Thank you for your visit ✨",
          intro: `Hi ${args.clientName}, thank you for visiting ${salonName}.`,
          body: "If you were happy with your treatment, we would really appreciate a short Google review.",
          button: "Leave a Google review",
          subject: `${salonName} — Thank you for your visit`,
        }
      : lang === "it"
        ? {
            title: "Grazie per la visita ✨",
            intro: `Ciao ${args.clientName}, grazie per aver visitato ${salonName}.`,
            body: "Se sei soddisfatto del trattamento, ci farebbe molto piacere ricevere una breve recensione su Google.",
            button: "Lascia una recensione Google",
            subject: `${salonName} — Grazie per la visita`,
          }
        : {
            title: "Hvala na dolasku ✨",
            intro: `Bok ${args.clientName}, hvala vam što ste posjetili ${salonName}.`,
            body: "Ako ste zadovoljni tretmanom, jako bi nam značilo da ostavite kratku Google recenziju.",
            button: "Ostavi Google recenziju",
            subject: `${salonName} — Hvala na dolasku`,
          };

  const content = `
    <h1 style="margin:0 0 14px;font-size:28px;line-height:1.25;color:#2f2723;">${escapeHtml(copy.title)}</h1>
    <p style="margin:0 0 18px;font-size:16px;line-height:1.7;color:#6f5a50;">${escapeHtml(copy.intro)}</p>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.7;color:#6f5a50;">${escapeHtml(copy.body)}</p>
    <a href="${escapeHtml(args.reviewUrl)}" style="display:inline-block;border-radius:14px;background:#2f2723;padding:14px 22px;color:#ffffff;text-decoration:none;font-weight:700;">${escapeHtml(copy.button)}</a>`;

  return sendManagedTenantEmail({
    organizationId: args.organizationId,
    capability: "review_requests",
    to: args.to,
    subject: copy.subject,
    html: layout(content, lang, args),
    displayName: salonName,
  });
}
