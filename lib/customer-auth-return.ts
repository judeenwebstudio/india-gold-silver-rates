export const DEFAULT_CUSTOMER_RETURN_TO = "/schemes/dashboard";

const BLOCKED_CUSTOMER_AUTH_PATHS = [
  "/admin",
  "/auth",
  "/login",
  "/register",
  "/forgot-password",
  "/schemes/reset-password",
  "/schemes/verify-email",
];

export function safeCustomerReturnTo(value: string | null | undefined): string {
  if (!value || value.length > 2_048 || /[\\\u0000-\u001f\u007f]/.test(value)) return DEFAULT_CUSTOMER_RETURN_TO;
  const original = new URL(value, "https://ratestack.invalid");
  if (original.origin !== "https://ratestack.invalid") return DEFAULT_CUSTOMER_RETURN_TO;
  let candidate = value;
  for (let depth = 0; depth < 3; depth += 1) {
    if (!candidate.startsWith("/") || candidate.startsWith("//")) return DEFAULT_CUSTOMER_RETURN_TO;
    const parsedCandidate = new URL(candidate, "https://ratestack.invalid");
    const candidatePath = parsedCandidate.pathname.toLocaleLowerCase();
    if (parsedCandidate.origin !== "https://ratestack.invalid" || BLOCKED_CUSTOMER_AUTH_PATHS.some(blocked => candidatePath === blocked || candidatePath.startsWith(`${blocked}/`))) return DEFAULT_CUSTOMER_RETURN_TO;
    let decoded: string;
    try { decoded = decodeURIComponent(candidate); } catch { return DEFAULT_CUSTOMER_RETURN_TO; }
    if (decoded === candidate) break;
    candidate = decoded;
  }
  if (!candidate.startsWith("/") || candidate.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(candidate)) return DEFAULT_CUSTOMER_RETURN_TO;
  return `${original.pathname}${original.search}${original.hash}`;
}
