import assert from "node:assert/strict";
import { GET } from "./where.ts";

const res = GET(
  new Request("https://fingerprint.gwanho.com/api/where", {
    headers: {
      "x-forwarded-for": "203.0.113.9, 10.0.0.1",
      "x-vercel-ip-country": "KR",
      "x-vercel-ip-country-region": "11",
      "x-vercel-ip-city": "Seoul",
      "x-vercel-ip-latitude": "37.5665",
      "x-vercel-ip-longitude": "126.978",
      "x-vercel-ip-timezone": "Asia/Seoul",
    },
  }),
);
assert.equal(res.headers.get("cache-control"), "no-store");
assert.match(res.headers.get("content-type") ?? "", /application\/json/);
assert.deepEqual(await res.json(), {
  ip: "203.0.113.9",
  country: "KR",
  region: "11",
  city: "Seoul",
  latitude: "37.5665",
  longitude: "126.978",
  timezone: "Asia/Seoul",
});

// Percent-encoded city names decode; headers that are absent stay absent.
const bare = await GET(new Request("https://x/api/where", { headers: { "x-vercel-ip-city": "S%C3%A3o%20Paulo" } })).json();
assert.equal(bare.city, "São Paulo");
assert.equal("country" in bare, false);
assert.equal("ip" in bare, false);
console.log("where: ok");
