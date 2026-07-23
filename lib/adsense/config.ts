const ADSENSE_CLIENT_PATTERN = /^ca-pub-\d{16}$/;

export type AdSenseConfiguration = {
  client: string | null;
  publisherId: string | null;
  autoAdsEnabled: boolean;
  adsTxtReady: boolean;
  siteVerificationConfigured: boolean;
};

type Environment = Record<string, string | undefined>;

export function normalizeAdSenseClient(value: string | undefined) {
  const client = value?.trim().toLowerCase() ?? "";
  return ADSENSE_CLIENT_PATTERN.test(client) ? client : null;
}

export function getAdSenseConfiguration(
  environment: Environment = process.env,
): AdSenseConfiguration {
  const client = normalizeAdSenseClient(
    environment.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT,
  );

  return {
    client,
    publisherId: client ? client.replace(/^ca-/, "") : null,
    autoAdsEnabled: Boolean(client),
    adsTxtReady: Boolean(client),
    siteVerificationConfigured: Boolean(client),
  };
}
