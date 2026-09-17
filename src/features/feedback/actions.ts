"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserPermissions } from "@/lib/permissions";
import { getPlatformAdminContext } from "@/lib/platform-admin";
import { sendFeedbackNotificationEmail } from "@/lib/email/feedback-email";
import {
  createFeedbackSchema,
  feedbackIdSchema,
  updateFeedbackSchema,
} from "@/features/feedback/validation";
import type { FeedbackActionResult } from "@/features/feedback/types";

const MAX_SCREENSHOT_SIZE = 5 * 1024 * 1024;
const ALLOWED_SCREENSHOT_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

const DONE_RETENTION_DAYS = 90;
const REJECTED_RETENTION_DAYS = 30;

function formValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : undefined;
}

function safeFileExtension(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

function revalidateFeedbackPaths(id?: string) {
  revalidatePath("/platform");
  revalidatePath("/platform/feedback");
  if (id) revalidatePath(`/platform/feedback/${id}`);
}

async function requireSystemDeveloper() {
  return getPlatformAdminContext();
}

async function deleteFeedbackRecords(ids: string[], screenshotPaths: string[]) {
  const supabase = createAdminClient();

  if (screenshotPaths.length > 0) {
    const { error: storageError } = await supabase.storage
      .from("feedback")
      .remove(screenshotPaths);

    if (storageError) {
      throw new Error(`Screenshot nije obrisan: ${storageError.message}`);
    }
  }

  const { error: deleteError } = await supabase
    .from("feedback")
    .delete()
    .in("id", ids);

  if (deleteError) throw new Error(deleteError.message);
}

export async function createFeedback(
  formData: FormData,
): Promise<FeedbackActionResult> {
  const permissions = await getCurrentUserPermissions();

  if (!permissions) {
    return { ok: false, error: "Morate biti prijavljeni." };
  }

  const parsed = createFeedbackSchema.safeParse({
    type: formValue(formData, "type"),
    priority: formValue(formData, "priority"),
    title: formValue(formData, "title"),
    description: formValue(formData, "description"),
    pageUrl: formValue(formData, "pageUrl"),
    userAgent: formValue(formData, "userAgent"),
    browser: formValue(formData, "browser"),
    operatingSystem: formValue(formData, "operatingSystem"),
    viewport: formValue(formData, "viewport"),
    language: formValue(formData, "language"),
    appVersion: formValue(formData, "appVersion"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Provjerite unesene podatke.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const screenshotValue = formData.get("screenshot");
  const screenshot =
    screenshotValue instanceof File && screenshotValue.size > 0
      ? screenshotValue
      : null;

  if (screenshot) {
    if (!ALLOWED_SCREENSHOT_TYPES.has(screenshot.type)) {
      return { ok: false, error: "Screenshot mora biti PNG, JPG ili WebP." };
    }

    if (screenshot.size > MAX_SCREENSHOT_SIZE) {
      return { ok: false, error: "Screenshot može imati najviše 5 MB." };
    }
  }

  const supabase = createAdminClient();
  const feedbackId = crypto.randomUUID();
  let screenshotPath: string | null = null;

  try {
    if (screenshot) {
      screenshotPath = `${permissions.userId}/${feedbackId}.${safeFileExtension(screenshot)}`;
      const bytes = new Uint8Array(await screenshot.arrayBuffer());
      const { error: uploadError } = await supabase.storage
        .from("feedback")
        .upload(screenshotPath, bytes, {
          contentType: screenshot.type,
          upsert: false,
        });

      if (uploadError) throw new Error(uploadError.message);
    }

    const { error: insertError } = await supabase.from("feedback").insert({
      id: feedbackId,
      created_by: permissions.userId,
      created_by_email: permissions.email,
      created_by_name: permissions.displayName,
      organization_id: permissions.organizationId,
      organization_name: permissions.organizationName,
      type: parsed.data.type,
      priority: parsed.data.priority,
      title: parsed.data.title,
      description: parsed.data.description,
      status: "open",
      screenshot_path: screenshotPath,
      page_url: parsed.data.pageUrl,
      user_agent: parsed.data.userAgent,
      browser: parsed.data.browser,
      operating_system: parsed.data.operatingSystem,
      viewport: parsed.data.viewport,
      language: parsed.data.language,
      app_version: parsed.data.appVersion,
    });

    if (insertError) throw new Error(insertError.message);
  } catch (error) {
    if (screenshotPath) {
      await supabase.storage.from("feedback").remove([screenshotPath]);
    }

    return {
      ok: false,
      error: error instanceof Error ? error.message : "Feedback nije spremljen.",
    };
  }

  try {
    await sendFeedbackNotificationEmail({
      feedbackId,
      salonName: permissions.organizationName,
      createdByName: permissions.displayName,
      createdByEmail: permissions.email,
      type: parsed.data.type,
      priority: parsed.data.priority,
      title: parsed.data.title,
      description: parsed.data.description,
      pageUrl: parsed.data.pageUrl,
    });
  } catch (emailError) {
    console.error("Feedback email notification failed:", emailError);
  }

  revalidateFeedbackPaths();
  return { ok: true, feedbackId };
}

export async function updateFeedback(
  input: unknown,
): Promise<FeedbackActionResult> {
  const platformAdmin = await requireSystemDeveloper();

  if (!platformAdmin) {
    return { ok: false, error: "Nemate dopuštenje za ovu radnju." };
  }

  const parsed = updateFeedbackSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Podaci za ažuriranje nisu ispravni." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("feedback")
    .update({
      status: parsed.data.status,
      admin_comment: parsed.data.adminComment,
    })
    .eq("id", parsed.data.id);

  if (error) return { ok: false, error: error.message };

  revalidateFeedbackPaths(parsed.data.id);
  return { ok: true, feedbackId: parsed.data.id };
}

export async function deleteFeedback(id: string): Promise<FeedbackActionResult> {
  const platformAdmin = await requireSystemDeveloper();
  if (!platformAdmin) {
    return { ok: false, error: "Nemate dopuštenje za ovu radnju." };
  }

  const parsedId = feedbackIdSchema.safeParse(id);
  if (!parsedId.success) {
    return { ok: false, error: "Neispravan feedback ID." };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("feedback")
    .select("id, screenshot_path")
    .eq("id", parsedId.data)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Feedback više ne postoji." };

  try {
    await deleteFeedbackRecords(
      [data.id],
      data.screenshot_path ? [data.screenshot_path] : [],
    );
  } catch (deleteError) {
    return {
      ok: false,
      error:
        deleteError instanceof Error
          ? deleteError.message
          : "Feedback nije obrisan.",
    };
  }

  revalidateFeedbackPaths();
  return { ok: true, feedbackId: parsedId.data, deletedCount: 1 };
}

export async function cleanupOldFeedback(): Promise<FeedbackActionResult> {
  const platformAdmin = await requireSystemDeveloper();
  if (!platformAdmin) {
    return { ok: false, error: "Nemate dopuštenje za ovu radnju." };
  }

  const now = Date.now();
  const doneBefore = new Date(
    now - DONE_RETENTION_DAYS * 86400000,
  ).toISOString();
  const rejectedBefore = new Date(
    now - REJECTED_RETENTION_DAYS * 86400000,
  ).toISOString();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("feedback")
    .select("id, screenshot_path, status, updated_at")
    .or(
      `and(status.eq.done,updated_at.lt.${doneBefore}),and(status.eq.rejected,updated_at.lt.${rejectedBefore})`,
    );

  if (error) return { ok: false, error: error.message };

  const candidates = data ?? [];
  if (candidates.length === 0) return { ok: true, deletedCount: 0 };

  try {
    await deleteFeedbackRecords(
      candidates.map((item) => item.id),
      candidates.flatMap((item) =>
        item.screenshot_path ? [item.screenshot_path] : [],
      ),
    );
  } catch (cleanupError) {
    return {
      ok: false,
      error:
        cleanupError instanceof Error
          ? cleanupError.message
          : "Čišćenje nije uspjelo.",
    };
  }

  revalidateFeedbackPaths();
  return { ok: true, deletedCount: candidates.length };
}
