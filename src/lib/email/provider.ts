import { Resend } from "resend";

export type EmailProviderMessage = {
  from: string;
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
};

export type EmailProviderResult = {
  provider: "resend";
  id: string | null;
};

export interface EmailProvider {
  send(message: EmailProviderMessage): Promise<EmailProviderResult>;
}

class ResendEmailProvider implements EmailProvider {
  private readonly resend: Resend;

  constructor(apiKey: string) {
    this.resend = new Resend(apiKey);
  }

  async send(message: EmailProviderMessage): Promise<EmailProviderResult> {
    const { data, error } = await this.resend.emails.send({
      from: message.from,
      to: [message.to],
      subject: message.subject,
      html: message.html,
      replyTo: message.replyTo,
    });

    if (error) throw new Error(error.message);

    return {
      provider: "resend",
      id: data?.id ?? null,
    };
  }
}

export function createManagedEmailProvider(): EmailProvider {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is missing");
  }

  return new ResendEmailProvider(apiKey);
}
