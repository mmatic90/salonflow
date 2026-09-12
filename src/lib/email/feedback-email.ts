import { Resend } from "resend";
import type {
  FeedbackPriority,
  FeedbackType,
} from "@/features/feedback/types";

const fromEmail =
  process.env.RESEND_FROM_EMAIL || "SalonFlow <onboarding@resend.dev>";
const feedbackRecipient =
  process.env.FEEDBACK_NOTIFICATION_EMAIL || "maticmaurizio@gmail.com";

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  return apiKey ? new Resend(apiKey) : null;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function sendFeedbackNotificationEmail(args: {
  feedbackId: string;
  createdByName: string;
  createdByEmail: string | null;
  type: FeedbackType;
  priority: FeedbackPriority;
  title: string;
  description: string;
  pageUrl: string | null;
}) {
  const resend = getResendClient();

  if (!resend) {
    console.info(
      "Feedback email skipped because RESEND_API_KEY is not configured.",
    );
    return;
  }

  const adminBaseUrl =
    process.env.NEXT_PUBLIC_ADMIN_URL || process.env.NEXT_PUBLIC_SITE_URL || "";
  const feedbackUrl = adminBaseUrl
    ? `${adminBaseUrl.replace(/\/$/, "")}/dashboard/feedback/${args.feedbackId}`
    : "";

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: [feedbackRecipient],
    subject: `[SalonFlow feedback] ${args.title}`,
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:680px;margin:0 auto;color:#2f2723;line-height:1.6;">
        <h1 style="font-size:24px;margin-bottom:20px;">Novi feedback</h1>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 0;font-weight:700;">Korisnik</td><td>${escapeHtml(args.createdByName)}</td></tr>
          <tr><td style="padding:8px 0;font-weight:700;">Email</td><td>${escapeHtml(args.createdByEmail ?? "Nije dostupan")}</td></tr>
          <tr><td style="padding:8px 0;font-weight:700;">Vrsta</td><td>${escapeHtml(args.type)}</td></tr>
          <tr><td style="padding:8px 0;font-weight:700;">Prioritet</td><td>${escapeHtml(args.priority)}</td></tr>
          <tr><td style="padding:8px 0;font-weight:700;">Stranica</td><td>${escapeHtml(args.pageUrl ?? "Nije dostupna")}</td></tr>
        </table>
        <h2 style="font-size:18px;margin:24px 0 8px;">${escapeHtml(args.title)}</h2>
        <div style="white-space:pre-wrap;padding:16px;border:1px solid #eadbd2;border-radius:14px;background:#f8f3ef;">${escapeHtml(args.description)}</div>
        ${feedbackUrl ? `<p style="margin-top:24px;"><a href="${escapeHtml(feedbackUrl)}" style="display:inline-block;padding:12px 18px;border-radius:12px;background:#2f2723;color:#fff;text-decoration:none;font-weight:700;">Otvori feedback</a></p>` : ""}
      </div>
    `,
  });

  if (error) throw new Error(error.message);
}
