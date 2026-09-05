import assert from "node:assert/strict";
import { SIZES, float, hash, integer, json, matrix, sort } from "./workloads.ts";
import { lcgWasm } from "./wasm.ts";

// Every workload is deterministic (same checksum twice) and does real work.
for (const [name, fn] of Object.entries({ integer, float, sort, hash, json, matrix })) {
  const n = SIZES[name as keyof typeof SIZES];
  const a = fn(n);
  assert.equal(fn(n), a, `${name} not deterministic`);
  assert.ok(Number.isFinite(a) && a !== 0, `${name} returned ${a}`);
}
// The wasm module runs the same recurrence as the JS integer workload.
assert.equal(lcgWasm()(SIZES.integer), integer(SIZES.integer));
console.log("workloads: ok");
