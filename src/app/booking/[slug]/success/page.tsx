import { notFound } from "next/navigation";
import PublicFooter from "@/components/public-footer";
import { getPublicBookingOrganizationBySlug } from "@/features/public-booking/queries";
import BookingSuccessClient from "../../success/success-client";

type Lang = "hr" | "en" | "it";

function getLang(value: string | undefined, fallback: Lang): Lang {
  return value === "hr" || value === "en" || value === "it" ? value : fallback;
}

export default async function TenantBookingSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    lang?: string;
    date?: string;
    time?: string;
    service?: string;
  }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const organization = await getPublicBookingOrganizationBySlug(slug);

  if (!organization) notFound();

  const lang = getLang(query.lang, organization.locale);

  return (
    <div data-theme={organization.theme} lang={lang} className="bg-app-bg text-app-text">
      <BookingSuccessClient
        organizationSlug={organization.slug}
        lang={lang}
        date={query.date ?? null}
        time={query.time ?? null}
        service={query.service ?? null}
      />
      <PublicFooter salonName={organization.name} />
    </div>
  );
}
