/**
 * Echoes what Vercel's edge already attached to this request: the client
 * address and its city-level lookup. Nothing is read from a body, nothing is
 * stored, nothing is logged. Deployed automatically from the api/ folder.
 */
export function GET(request: Request): Response {
  const h = (name: string) => request.headers.get(name) ?? undefined;
  const city = h("x-vercel-ip-city");
  const body = {
    ip: h("x-forwarded-for")?.split(",")[0].trim(),
    country: h("x-vercel-ip-country"),
    region: h("x-vercel-ip-country-region"),
    city: city && decodeURIComponent(city),
    latitude: h("x-vercel-ip-latitude"),
    longitude: h("x-vercel-ip-longitude"),
    timezone: h("x-vercel-ip-timezone"),
  };
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
