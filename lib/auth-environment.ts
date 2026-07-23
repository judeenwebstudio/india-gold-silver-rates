const AUTH_URL_KEYS = ["AUTH_URL", "NEXTAUTH_URL"] as const;

function removeMatchingQuotes(value: string) {
  const first = value.at(0);
  const last = value.at(-1);

  if (
    value.length >= 2 &&
    ((first === '"' && last === '"') || (first === "'" && last === "'"))
  ) {
    return value.slice(1, -1).trim();
  }

  return value;
}

function normalizeAuthUrl(value: string) {
  const normalized = removeMatchingQuotes(value.trim());
  const parsed = new URL(normalized);

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new TypeError("The Auth.js URL must use HTTP or HTTPS.");
  }

  return normalized;
}

export function sanitizeAuthUrlEnvironment(
  environment: Record<string, string | undefined> = process.env,
) {
  for (const key of AUTH_URL_KEYS) {
    const value = environment[key];
    if (!value) continue;

    try {
      environment[key] = normalizeAuthUrl(value);
    } catch {
      // Auth.js v5 can infer the canonical URL from trusted request headers.
      // Removing an invalid optional override prevents `new URL()` failures.
      delete environment[key];
    }
  }
}
