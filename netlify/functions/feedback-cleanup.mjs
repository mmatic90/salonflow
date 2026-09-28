import { createClient } from "@supabase/supabase-js";

const DONE_RETENTION_DAYS = 90;
const REJECTED_RETENTION_DAYS = 30;

const feedbackCleanup = async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response("Missing Supabase environment variables.", { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const now = Date.now();
  const doneBefore = new Date(now - DONE_RETENTION_DAYS * 86400000).toISOString();
  const rejectedBefore = new Date(now - REJECTED_RETENTION_DAYS * 86400000).toISOString();

  const { data, error } = await supabase
    .from("feedback")
    .select("id, screenshot_path")
    .or(`and(status.eq.done,updated_at.lt.${doneBefore}),and(status.eq.rejected,updated_at.lt.${rejectedBefore})`);

  if (error) return new Response(error.message, { status: 500 });

  const candidates = data ?? [];
  if (candidates.length === 0) {
    return new Response(JSON.stringify({ deletedCount: 0 }), {
      headers: { "content-type": "application/json" },
    });
  }

  const screenshotPaths = candidates.flatMap((item) =>
    item.screenshot_path ? [item.screenshot_path] : [],
  );

  if (screenshotPaths.length > 0) {
    const { error: storageError } = await supabase.storage
      .from("feedback")
      .remove(screenshotPaths);

    if (storageError) return new Response(storageError.message, { status: 500 });
  }

  const { error: deleteError } = await supabase
    .from("feedback")
    .delete()
    .in("id", candidates.map((item) => item.id));

  if (deleteError) return new Response(deleteError.message, { status: 500 });

  return new Response(JSON.stringify({ deletedCount: candidates.length }), {
    headers: { "content-type": "application/json" },
  });
};

export default feedbackCleanup;

export const config = {
  schedule: "0 3 * * *",
};
