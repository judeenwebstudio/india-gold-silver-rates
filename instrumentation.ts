export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const { logResolvedProviderOrder } = await import("./lib/scrapers/config");
  logResolvedProviderOrder("application-startup");
}
