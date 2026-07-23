import Script from "next/script";

export function GoogleAdSense({ client }: { client: string }) {
  return (
    <Script
      id="google-adsense-auto-ads"
      async
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`}
      strategy="afterInteractive"
    />
  );
}
