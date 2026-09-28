const routes = [
  "/api/cron/email-reminders",
  "/api/cron/review-requests",
];

const emailAutomations = async () => {
  const siteUrl = (process.env.URL || process.env.DEPLOY_PRIME_URL || "").replace(/\/$/, "");
  const cronSecret = process.env.CRON_SECRET;

  if (!siteUrl || !cronSecret) {
    console.error("email-automations is missing URL or CRON_SECRET.");
    return new Response("Scheduled job is not configured.", { status: 500 });
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

      if (!response.ok) {
        const body = await response.text();
        console.error(`[email-automations:${route}] ${response.status}`, body.slice(0, 4000));
      }

      results.push({
        route,
        ok: response.ok,
        status: response.status,
      });
    } catch (error) {
      console.error(`[email-automations:${route}]`, error);
      results.push({ route, ok: false, status: 0 });
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
