import { notFound } from "next/navigation";
import { getPublicBookingOrganizationBySlug } from "@/features/public-booking/queries";

export default async function SalonPublicLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}>) {
  const { slug } = await params;
  const organization = await getPublicBookingOrganizationBySlug(slug);

  if (!organization) notFound();

  return (
    <div
      data-theme={organization.theme}
      className="min-h-screen bg-app-bg text-app-text"
    >
      {children}
    </div>
  );
}
