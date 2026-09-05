import assert from "node:assert/strict";
import { sha256 } from "./hash.ts";

// NIST test vector: catches a broken hex encoding (missing zero-padding, byte order).
assert.equal(
  await sha256("abc"),
  "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
);

// A string and its bytes must hash identically.
assert.equal(await sha256("abc"), await sha256(new TextEncoder().encode("abc")));

console.log("hash.test.ts ok");
