const ADS_TXT_CONTENT =
  "google.com, pub-1593649181553357, DIRECT, f08c47fec0942fa0";

export function GET() {
  return new Response(ADS_TXT_CONTENT, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
