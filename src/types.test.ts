import assert from "node:assert/strict";
import { result, guard, unavailable } from "./types.ts";

assert.deepEqual(result("Cores", 12), {
  name: "Cores",
  supported: true,
  evidenceType: "DIRECT",
  value: 12,
});

// 0 and false are real values, not "missing".
assert.equal(result("Touch points", 0).supported, true);
assert.equal(result("Webdriver", false).supported, true);

for (const missing of [undefined, null, "", NaN]) {
  const r = result("X", missing);
  assert.equal(r.supported, false, `${String(missing)} should be unsupported`);
  assert.equal(r.evidenceType, "UNAVAILABLE");
  assert.equal("value" in r, false);
}

// Explicit evidence type survives.
assert.equal(result("Memory", 8, "COARSE").evidenceType, "COARSE");
// ...but not for a missing value: nothing was measured, so nothing was coarsened.
assert.equal(result("Memory", undefined, "COARSE").evidenceType, "UNAVAILABLE");

const thrown = await guard("Boom", () => {
  throw new Error("nope");
});
assert.equal(thrown.title, "Boom");
assert.equal(thrown.results[0].error, "nope");

const ok = await guard("Fine", () => ({ title: "Fine", results: [] }));
assert.deepEqual(ok, { title: "Fine", results: [] });

// unavailable(): a value no page can read, by design — rendered with the reason, not "not exposed".
assert.deepEqual(unavailable("CPU serial"), {
  name: "CPU serial",
  supported: false,
  evidenceType: "UNAVAILABLE",
  error: "never exposed to web pages",
});

console.log("types: ok");
