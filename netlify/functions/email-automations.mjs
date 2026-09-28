const routes = [
  "/api/cron/email-reminders",
  "/api/cron/review-requests",
];

const emailAutomations = async () => {
  const siteUrl = (process.env.URL || process.env.DEPLOY_PRIME_URL || "").replace(/\/$/, "");
  const cronSecret = process.env.CRON_SECRET;

  if (!siteUrl || !cronSecret) {
    return new Response("Missing URL or CRON_SECRET environment variable.", {
      status: 500,
    });
  }

  const results = [];

  for (const route of routes) {
    try {
      const response = await fetch(`${siteUrl}${route}`, {
        method: "GET",
        headers: {
          authorization: `Bearer ${cronSecret}`,
          accept: "application/json",
        },
      });
      const body = await response.text();

      results.push({
        route,
        ok: response.ok,
        status: response.status,
        body: body.slice(0, 4000),
      });
    } catch (error) {
      results.push({
        route,
        ok: false,
        status: 0,
        body: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const ok = results.every((result) => result.ok);
  return new Response(JSON.stringify({ ok, results }), {
    status: ok ? 200 : 500,
    headers: { "content-type": "application/json" },
  });
};

export default emailAutomations;

export const config = {
  schedule: "0 * * * *",
};
