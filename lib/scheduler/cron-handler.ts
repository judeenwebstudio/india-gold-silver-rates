import { isValidCronAuthorization } from "@/lib/scheduler/cron-auth";

export type CronExecutionResult = {
  ok: boolean;
  outcome: "SUCCESS" | "NO_CHANGE" | "FAILED" | "REJECTED";
  message: string;
  database?: {
    created: number;
    updated: number;
    unchanged: number;
    historyEntries: number;
  };
  locked?: boolean;
};

export async function handleRateSyncCron(
  request: Request,
  {
    secret,
    execute,
  }: {
    secret: string | undefined;
    execute: () => Promise<CronExecutionResult>;
  },
) {
  const authorization = request.headers.get("authorization");
  const authorized = isValidCronAuthorization(authorization, secret);
  if (!authorized) {
    console.warn("[rate-sync-cron] authorization rejected", {
      authorizationPresent: Boolean(authorization),
      cronSecretConfigured: Boolean(secret?.trim()),
    });
    return Response.json(
      { ok: false, outcome: "UNAUTHORIZED", message: "Unauthorized" },
      { status: 401 },
    );
  }

  let result: CronExecutionResult;
  try {
    result = await execute();
  } catch (error) {
    console.error("[rate-sync-cron] unhandled execution failure", {
      reason: error instanceof Error ? error.message : "Unknown error",
      errorName: error instanceof Error ? error.name : "UnknownError",
    });

    return Response.json(
      {
        ok: false,
        outcome: "FAILED",
        message: "The scheduled rate synchronization failed unexpectedly.",
        changedRates: 0,
      },
      { status: 502 },
    );
  }
  const changedRates =
    (result.database?.created ?? 0) + (result.database?.updated ?? 0);
  const status = result.ok ? 200 : result.locked ? 409 : result.outcome === "REJECTED" ? 422 : 502;

  return Response.json(
    {
      ok: result.ok,
      outcome: result.outcome,
      message: result.message,
      changedRates,
    },
    { status },
  );
}
