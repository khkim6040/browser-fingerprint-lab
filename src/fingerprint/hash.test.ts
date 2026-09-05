import assert from "node:assert/strict";
import { sha256, stableHash } from "./hash.ts";

// NIST test vector: catches a broken hex encoding (missing zero-padding, byte order).
assert.equal(
  await sha256("abc"),
  "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
);

// A string and its bytes must hash identically.
assert.equal(await sha256("abc"), await sha256(new TextEncoder().encode("abc")));

// stableHash: two identical draws collapse to one 16-hex prefix; two different
// draws are reported as unstable rather than hidden; no draw means no hash.
assert.equal(await stableHash(() => "abc"), "ba7816bf8f01cfea");
let n = 0;
assert.match(
  await stableHash(async () => `draw ${n++}`),
  /^unstable — redraw gave [0-9a-f]{16} then [0-9a-f]{16}$/,
);
assert.equal(await stableHash(() => undefined), undefined);

console.log("hash.test.ts ok");
