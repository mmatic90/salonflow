import { MessageCircle } from "lucide-react";

type Props = {
  phone: string;
  lang?: "hr" | "en" | "it";
};

function toWhatsAppPhone(phone: string) {
  return phone.replace(/\D/g, "");
}

export default function FloatingWhatsAppButton({
  phone,
  lang = "hr",
}: Props) {
  const label =
    lang === "en"
      ? "Contact us on WhatsApp"
      : lang === "it"
        ? "Contattaci su WhatsApp"
        : "Kontaktiraj nas na WhatsApp";

  const normalizedPhone = toWhatsAppPhone(phone);

  if (!normalizedPhone) return null;

  return (
    <a
      href={`https://wa.me/${normalizedPhone}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="fixed bottom-5 right-5 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full border border-app-soft bg-app-dark text-white shadow-xl transition hover:-translate-y-0.5 hover:opacity-90"
    >
      <MessageCircle className="h-6 w-6" />
    </a>
  );
}
