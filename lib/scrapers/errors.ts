export class ScraperError extends Error {
  readonly details?: Record<string, unknown>;

  constructor(message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = new.target.name;
    this.details = details;
  }
}

export class ScraperRejectedError extends ScraperError {}

export class ScraperFetchError extends ScraperError {}

export class ScraperConfigurationError extends ScraperRejectedError {}

export class RateSyncLockUnavailableError extends ScraperRejectedError {}
