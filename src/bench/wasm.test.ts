import assert from "node:assert/strict";
import { lcgWasm } from "./wasm.ts";

// The module must run the same 32-bit LCG as the JS reference, n times.
const ref = (n: number) => {
  let a = 0;
  for (let i = 0; i < n; i++) a = (Math.imul(a, 1664525) + 1013904223) | 0;
  return a;
};
const run = lcgWasm();
assert.equal(run(0), 0);
assert.equal(run(1), 1013904223);
assert.equal(run(1000), ref(1000));
console.log("wasm: ok");
