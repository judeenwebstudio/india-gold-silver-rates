import "dotenv/config";

const secret = process.env.CRON_SECRET;

if (!secret) {
  throw new Error(
    "CRON_SECRET is not configured in the local environment. The endpoint was not called.",
  );
}

const response = await fetch("http://localhost:3000/api/cron/rate-sync", {
  method: "GET",
  headers: {
    Authorization: `Bearer ${secret}`,
  },
});

const body = (await response.json()) as {
  outcome?: string;
  message?: string;
  changedRates?: number;
};

console.log(
  `Cron endpoint returned HTTP ${response.status}: ${body.outcome ?? "UNKNOWN"} — ${
    body.message ?? "No message"
  } Changed rates: ${body.changedRates ?? 0}.`,
);

if (!response.ok) {
  process.exitCode = 1;
}
