"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...arguments_: unknown[]) => void;
  }
}

export function GoogleAnalytics({
  measurementId,
}: {
  measurementId: string;
}) {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!ready || !pathname || typeof window.gtag !== "function") return;

    window.gtag("event", "page_view", {
      page_path: pathname,
      page_title: document.title,
      page_location: window.location.href,
    });
  }, [pathname, ready]);

  return (
    <>
      <Script
        id="google-analytics-loader"
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`}
        strategy="afterInteractive"
        onLoad={() => setReady(true)}
      />
      <Script id="google-analytics-config" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', ${JSON.stringify(measurementId)}, { send_page_view: false });
        `}
      </Script>
    </>
  );
}
