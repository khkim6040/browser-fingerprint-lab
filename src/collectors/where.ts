import { result, unavailable, type CollectorResult, type Section } from "../types";

const NAMES = ["IP address", "Country", "Region", "City", "Coordinates", "IP timezone", "Edge region"];
const NOTE =
  "What the request itself told the server before any script ran: the address the reply had to reach, and the city Vercel's edge attaches to that address. The page's code keeps none of it, and still sends none of what it collected.";

interface Seen {
  ip?: string;
  country?: string;
  region?: string;
  city?: string;
  latitude?: string;
  longitude?: string;
  timezone?: string;
}

/** Asks this site's own function what it saw in the request. No collected data travels with the call. */
async function ask(): Promise<{ seen: Seen; edge?: string } | undefined> {
  try {
    const res = await fetch("/api/where", { signal: AbortSignal.timeout(3000) });
    if (!res.ok || !res.headers.get("content-type")?.includes("json")) return undefined;
    // "icn1::iad1::…" — the first token is the edge that took the request.
    return { seen: await res.json(), edge: res.headers.get("x-vercel-id")?.split("::")[0] || undefined };
  } catch {
    return undefined;
  }
}

export async function collectServer(): Promise<Section> {
  const answer = await ask();
  const results: CollectorResult[] = answer
    ? [
        result("IP address", answer.seen.ip),
        result("Country", answer.seen.country, "COARSE"),
        result("Region", answer.seen.region, "COARSE"),
        result("City", answer.seen.city, "COARSE"),
        result(
          "Coordinates",
          answer.seen.latitude && answer.seen.longitude ? `${(+answer.seen.latitude).toFixed(2)}, ${(+answer.seen.longitude).toFixed(2)}` : undefined,
          "COARSE",
        ),
        result("IP timezone", answer.seen.timezone, "COARSE"),
        result("Edge region", answer.edge),
      ]
    : NAMES.map((n) => unavailable(n, "no server behind this build; deployed on Vercel it answers"));
  return { title: "Server", note: NOTE, results };
}
