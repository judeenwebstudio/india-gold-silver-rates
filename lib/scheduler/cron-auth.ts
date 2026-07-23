import { createHash, timingSafeEqual } from "node:crypto";

function digest(value: string) {
  return createHash("sha256").update(value, "utf8").digest();
}

export function isValidCronAuthorization(
  authorizationHeader: string | null,
  configuredSecret: string | undefined,
) {
  if (!authorizationHeader || !configuredSecret) return false;

  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i);
  if (!match?.[1]) return false;

  return timingSafeEqual(digest(match[1]), digest(configuredSecret));
}
