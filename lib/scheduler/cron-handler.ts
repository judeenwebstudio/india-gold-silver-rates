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
  if (
    !isValidCronAuthorization(request.headers.get("authorization"), secret)
  ) {
    return Response.json(
      { ok: false, outcome: "UNAUTHORIZED", message: "Unauthorized" },
      { status: 401 },
    );
  }

  const result = await execute();
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
