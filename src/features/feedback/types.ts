export const feedbackTypes = [
  "bug",
  "improvement",
  "idea",
  "question",
] as const;

export const feedbackPriorities = [
  "low",
  "medium",
  "high",
  "critical",
] as const;

export const feedbackStatuses = [
  "open",
  "investigating",
  "in_progress",
  "waiting",
  "done",
  "rejected",
] as const;

export type FeedbackType = (typeof feedbackTypes)[number];
export type FeedbackPriority = (typeof feedbackPriorities)[number];
export type FeedbackStatus = (typeof feedbackStatuses)[number];

export type FeedbackRow = {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  created_by_email: string | null;
  created_by_name: string | null;
  organization_id: string | null;
  organization_name: string | null;
  type: FeedbackType;
  priority: FeedbackPriority;
  title: string;
  description: string;
  status: FeedbackStatus;
  screenshot_path: string | null;
  page_url: string | null;
  user_agent: string | null;
  browser: string | null;
  operating_system: string | null;
  viewport: string | null;
  language: string | null;
  app_version: string | null;
  admin_comment: string | null;
};

export type FeedbackStats = {
  total: number;
  screenshots: number;
  screenshotBytes: number;
  cleanupCandidates: number;
};

export type FeedbackActionResult =
  | { ok: true; feedbackId?: string; deletedCount?: number }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };
