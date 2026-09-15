import { redirect } from "next/navigation";

export default async function LegacyFeedbackDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/platform/feedback/${id}`);
}
