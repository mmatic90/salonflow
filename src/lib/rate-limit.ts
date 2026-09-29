import { createAdminClient } from "@/lib/supabase/admin";

type CheckRateLimitArgs = {
  ip: string;
  endpoint: string;
  limit?: number;
  windowMinutes?: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
};

export async function checkRateLimit({
  ip,
  endpoint,
  limit = 5,
  windowMinutes = 10,
}: CheckRateLimitArgs): Promise<RateLimitResult> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("consume_public_api_rate_limit", {
    p_ip_address: ip,
    p_endpoint: endpoint,
    p_limit: limit,
    p_window_minutes: windowMinutes,
  });

  if (error) {
    throw new Error(error.message);
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row.allowed !== "boolean") {
    throw new Error("Invalid public API rate-limit response.");
  }

  return {
    allowed: row.allowed,
    remaining: Number.isFinite(Number(row.remaining))
      ? Number(row.remaining)
      : 0,
  };
}
