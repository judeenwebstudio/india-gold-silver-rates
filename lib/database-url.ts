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

export function normalizeDatabaseConnectionString(value: string | undefined) {
  if (!value?.trim()) {
    throw new Error(
      "DATABASE_URL is required at runtime. Configure the Supabase transaction-pooler URL in Vercel.",
    );
  }

  let parsed: URL;

  try {
    parsed = new URL(removeMatchingQuotes(value.trim()));
  } catch {
    throw new Error(
      "DATABASE_URL is invalid. In Vercel, enter only the PostgreSQL connection string without a variable name or wrapping quotes.",
    );
  }

  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    throw new Error("DATABASE_URL must use the postgres or postgresql protocol.");
  }

  // The pg adapter owns TLS configuration below. Removing libpq-only options
  // avoids conflicting SSL behavior and unsupported-parameter warnings.
  parsed.searchParams.delete("sslmode");
  parsed.searchParams.delete("uselibpqcompat");

  return parsed.toString();
}
