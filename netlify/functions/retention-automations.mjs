const retentionAutomations = async () => {
  const siteUrl = (process.env.URL || process.env.DEPLOY_PRIME_URL || "").replace(/\/$/, "");
  const cronSecret = process.env.CRON_SECRET;

  if (!siteUrl || !cronSecret) {
    console.error("retention-automations is missing URL or CRON_SECRET.");
    return new Response("Scheduled job is not configured.", { status: 500 });
  }

  try {
    const response = await fetch(`${siteUrl}/api/cron/retention-followups`, {
      method: "GET",
      headers: {
        authorization: `Bearer ${cronSecret}`,
        accept: "application/json",
      },
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`[retention-automations] ${response.status}`, body.slice(0, 4000));
    }

    return new Response(
      JSON.stringify({
        ok: response.ok,
        status: response.status,
      }),
      {
        status: response.ok ? 200 : 500,
        headers: { "content-type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[retention-automations]", error);
    return new Response(
      JSON.stringify({ ok: false, status: 0 }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      },
    );
  }
};

export default retentionAutomations;

export const config = {
  // 07:15 UTC once per day. Tenant local dates are still used for the run guard.
  schedule: "15 7 * * *",
};
