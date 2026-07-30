export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const { logResolvedProviderOrder } = await import("./lib/scrapers/config");
  logResolvedProviderOrder("application-startup");
  const enabled=process.env.SHIPROCKET_ENABLED==="true";
  const configured=Boolean(process.env.SHIPROCKET_EMAIL&&process.env.SHIPROCKET_PASSWORD&&process.env.SHIPROCKET_BASE_URL);
  console.info("[logistics] startup configuration",{enabled,configured,pickupLocationConfigured:Boolean(process.env.SHIPROCKET_PICKUP_LOCATION),webhookSecretConfigured:Boolean(process.env.SHIPROCKET_WEBHOOK_SECRET),packageDefaultsConfigured:Boolean(process.env.SHIPROCKET_DEFAULT_LENGTH_CM&&process.env.SHIPROCKET_DEFAULT_BREADTH_CM&&process.env.SHIPROCKET_DEFAULT_HEIGHT_CM&&process.env.SHIPROCKET_DEFAULT_WEIGHT_KG)});
}
