import { getAdSenseConfiguration } from "@/lib/adsense/config";

export const dynamic = "force-dynamic";

export function GET() {
  const configuration = getAdSenseConfiguration();

  if (!configuration.publisherId) {
    return new Response("AdSense publisher is not configured.\n", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  return new Response(
    `google.com, ${configuration.publisherId}, DIRECT, f08c47fec0942fa0\n`,
    {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "public, max-age=3600, s-maxage=3600",
      },
    },
  );
}
