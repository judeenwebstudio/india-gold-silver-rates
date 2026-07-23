export const DEFAULT_RETRY_DELAY_MS = 500;

export type RetryExecutionResult<T> = {
  value: T;
  attempts: number;
};

export class RetryExecutionError extends Error {
  readonly attempts: number;
  readonly originalError: unknown;

  constructor(originalError: unknown, attempts: number) {
    super(
      originalError instanceof Error
        ? originalError.message
        : "The scheduled operation failed.",
      { cause: originalError },
    );
    this.name = "RetryExecutionError";
    this.attempts = attempts;
    this.originalError = originalError;
  }
}

export async function runWithExponentialBackoff<T>({
  operation,
  maxAttempts,
  isRetryable,
  wait = (delayMs) =>
    new Promise<void>((resolve) => {
      setTimeout(resolve, delayMs);
    }),
  baseDelayMs = DEFAULT_RETRY_DELAY_MS,
}: {
  operation: (attempt: number) => Promise<T>;
  maxAttempts: number;
  isRetryable: (error: unknown) => boolean;
  wait?: (delayMs: number) => Promise<void>;
  baseDelayMs?: number;
}): Promise<RetryExecutionResult<T>> {
  const boundedAttempts = Math.max(1, Math.min(3, Math.trunc(maxAttempts)));

  for (let attempt = 1; attempt <= boundedAttempts; attempt += 1) {
    try {
      return { value: await operation(attempt), attempts: attempt };
    } catch (error) {
      if (attempt >= boundedAttempts || !isRetryable(error)) {
        throw new RetryExecutionError(error, attempt);
      }

      await wait(baseDelayMs * 2 ** (attempt - 1));
    }
  }

  throw new RetryExecutionError(
    new Error("The scheduled operation exhausted its attempts."),
    boundedAttempts,
  );
}

export type ExecutionLeaseManager<TLease> = {
  acquire: () => Promise<TLease | null>;
  release: (lease: TLease) => Promise<void>;
};

export type LockedRetryPipelineResult<TResult> =
  | { acquired: false }
  | { acquired: true; result: TResult; attempts: number };

export async function runLockedRetryPipeline<TLease, TPrepared, TResult>({
  leaseManager,
  prepare,
  commit,
  maxAttempts,
  isRetryable,
  wait,
}: {
  leaseManager: ExecutionLeaseManager<TLease>;
  prepare: (attempt: number) => Promise<TPrepared>;
  commit: (prepared: TPrepared, attempts: number) => Promise<TResult>;
  maxAttempts: number;
  isRetryable: (error: unknown) => boolean;
  wait?: (delayMs: number) => Promise<void>;
}): Promise<LockedRetryPipelineResult<TResult>> {
  const lease = await leaseManager.acquire();
  if (!lease) return { acquired: false };

  try {
    const prepared = await runWithExponentialBackoff({
      operation: prepare,
      maxAttempts,
      isRetryable,
      wait,
    });

    return {
      acquired: true,
      result: await commit(prepared.value, prepared.attempts),
      attempts: prepared.attempts,
    };
  } finally {
    await leaseManager.release(lease);
  }
}
