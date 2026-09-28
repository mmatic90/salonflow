const retentionAutomations = async () => {
  const siteUrl = (process.env.URL || process.env.DEPLOY_PRIME_URL || "").replace(/\/$/, "");
  const cronSecret = process.env.CRON_SECRET;

  if (!siteUrl || !cronSecret) {
    return new Response("Missing URL or CRON_SECRET environment variable.", {
      status: 500,
    });
  }

  try {
    const response = await fetch(`${siteUrl}/api/cron/retention-followups`, {
      method: "GET",
      headers: {
        authorization: `Bearer ${cronSecret}`,
        accept: "application/json",
      },
    });
    const body = await response.text();

    return new Response(
      JSON.stringify({
        ok: response.ok,
        status: response.status,
        body: body.slice(0, 4000),
      }),
      {
        status: response.ok ? 200 : 500,
        headers: { "content-type": "application/json" },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        ok: false,
        status: 0,
        body: error instanceof Error ? error.message : "Unknown error",
      }),
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
