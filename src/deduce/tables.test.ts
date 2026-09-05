import assert from "node:assert/strict";
import { APPLE_CHIPS, GPU_CLASSES, PANELS } from "./tables.ts";

// One row per (chip, cores); every row names at least one product and a RAM floor.
const seen = new Set<string>();
for (const c of APPLE_CHIPS) {
  const key = `${c.chip}/${c.cores}`;
  assert.ok(!seen.has(key), `duplicate ${key}`);
  seen.add(key);
  assert.ok(c.products.length > 0 && c.minRam > 0, key);
}
assert.deepEqual(APPLE_CHIPS.find((c) => c.chip === "M4 Pro" && c.cores === 12)?.products, ["MacBook Pro 14", "Mac mini"]);

// Panel product names are Mac names from APPLE_CHIPS, or standalone displays.
const macs = new Set(APPLE_CHIPS.flatMap((c) => c.products));
for (const p of PANELS) for (const name of p.products) assert.ok(macs.has(name) || /Display/.test(name), `panel product ${name} is not a Mac name`);
assert.deepEqual(PANELS.find((p) => p.width === 1512 && p.height === 982)?.products, ["MacBook Pro 14"]);

// First match wins, so laptop strings must beat the generic discrete pattern.
assert.equal(GPU_CLASSES.find((g) => g.pattern.test("NVIDIA GeForce RTX 4070 Laptop GPU"))?.kind, "laptop");
assert.equal(GPU_CLASSES.find((g) => g.pattern.test("NVIDIA GeForce RTX 4070"))?.kind, "discrete");
assert.equal(GPU_CLASSES.find((g) => g.pattern.test("Intel(R) Iris(R) Xe Graphics"))?.kind, "integrated");
assert.equal(GPU_CLASSES.find((g) => g.pattern.test("AMD Radeon(TM) Graphics"))?.kind, "integrated");
assert.equal(GPU_CLASSES.find((g) => g.pattern.test("Intel(R) Arc(TM) A770 Graphics"))?.kind, "discrete");
assert.equal(GPU_CLASSES.find((g) => g.pattern.test("Google SwiftShader"))?.kind, "software");
console.log("tables: ok");
