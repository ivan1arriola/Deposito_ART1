const SSLMODE_ALIASES_TO_VERIFY_FULL = new Set(["prefer", "require", "verify-ca"]);
const TRUTHY_VALUES = new Set(["1", "true", "yes", "on"]);

/**
 * Keeps current secure pg-connection-string behavior across pg v8 -> v9 upgrades.
 * If sslmode is one of the alias modes and libpq-compat mode is not explicitly requested,
 * we normalize to sslmode=verify-full to avoid warnings and semantic drift.
 */
export function normalizePgConnectionStringSecurity(connectionString: string) {
  try {
    const parsedUrl = new URL(connectionString);
    const protocol = parsedUrl.protocol.toLowerCase();
    if (protocol !== "postgresql:" && protocol !== "postgres:") {
      return connectionString;
    }

    const sslMode = (parsedUrl.searchParams.get("sslmode") ?? "").trim().toLowerCase();
    if (!SSLMODE_ALIASES_TO_VERIFY_FULL.has(sslMode)) {
      return connectionString;
    }

    const useLibpqCompat = (parsedUrl.searchParams.get("uselibpqcompat") ?? "")
      .trim()
      .toLowerCase();
    if (TRUTHY_VALUES.has(useLibpqCompat)) {
      return connectionString;
    }

    parsedUrl.searchParams.set("sslmode", "verify-full");
    return parsedUrl.toString();
  } catch {
    return connectionString;
  }
}
