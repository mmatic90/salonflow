import BookingSuccessClient from "../../success/success-client";

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

  return (
    <BookingSuccessClient
      organizationSlug={slug}
      lang={query.lang ?? null}
      date={query.date ?? null}
      time={query.time ?? null}
      service={query.service ?? null}
    />
  );
}
