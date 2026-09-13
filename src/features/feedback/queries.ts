import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { feedbackIdSchema } from "@/features/feedback/validation";
import type { FeedbackRow, FeedbackStats } from "@/features/feedback/types";

const DONE_RETENTION_DAYS = 90;
const REJECTED_RETENTION_DAYS = 30;

export async function getFeedbackList(): Promise<FeedbackRow[]> {
  await requirePlatformAdmin();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("feedback")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []) as FeedbackRow[];
}

export async function getFeedbackStats(items?: FeedbackRow[]): Promise<FeedbackStats> {
  await requirePlatformAdmin();

  const feedbackItems = items ?? (await getFeedbackList());
  const now = Date.now();
  const doneCutoff = now - DONE_RETENTION_DAYS * 86400000;
  const rejectedCutoff = now - REJECTED_RETENTION_DAYS * 86400000;

  const cleanupCandidates = feedbackItems.filter((item) => {
    const updatedAt = new Date(item.updated_at).getTime();
    return (
      (item.status === "done" && updatedAt < doneCutoff) ||
      (item.status === "rejected" && updatedAt < rejectedCutoff)
    );
  }).length;

  const screenshotItems = feedbackItems.filter((item) => item.screenshot_path);
  const supabase = createAdminClient();
  let screenshotBytes = 0;

  const userFolders = [
    ...new Set(
      screenshotItems
        .map((item) => item.screenshot_path?.split("/")[0])
        .filter((value): value is string => Boolean(value)),
    ),
  ];

  for (const folder of userFolders) {
    const { data, error } = await supabase.storage
      .from("feedback")
      .list(folder, { limit: 1000 });

    if (!error) {
      screenshotBytes += (data ?? []).reduce(
        (sum, file) =>
          sum +
          (typeof file.metadata?.size === "number" ? file.metadata.size : 0),
        0,
      );
    }
  }

  return {
    total: feedbackItems.length,
    screenshots: screenshotItems.length,
    screenshotBytes,
    cleanupCandidates,
  };
}

export async function getFeedbackById(id: string): Promise<FeedbackRow | null> {
  await requirePlatformAdmin();

  const parsedId = feedbackIdSchema.safeParse(id);
  if (!parsedId.success) return null;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("feedback")
    .select("*")
    .eq("id", parsedId.data)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return (data as FeedbackRow | null) ?? null;
}

export async function createFeedbackScreenshotSignedUrl(
  path: string,
  download = false,
) {
  await requirePlatformAdmin();

  const supabase = createAdminClient();
  const fileName = path.split("/").pop() ?? "feedback-screenshot";
  const { data, error } = await supabase.storage
    .from("feedback")
    .createSignedUrl(
      path,
      60 * 15,
      download ? { download: fileName } : undefined,
    );

  if (error) throw new Error(error.message);

  return data.signedUrl;
}
