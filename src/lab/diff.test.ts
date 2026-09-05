import assert from "node:assert/strict";
import { diff, stability, parseSnapshot } from "./diff.ts";
import { result } from "../types.ts";

const before = [
  { title: "CPU", results: [result("Cores", 8), result("Old", 1)] },
  { title: "Display", results: [result("Width", 1440), result("Memory", undefined)] },
];
const after = [
  { title: "CPU", results: [result("Cores", 8), result("Added", 2)] },
  { title: "Display", results: [result("Width", 1920), result("Memory", undefined)] },
];

const rows = diff(before, after);
const by = Object.fromEntries(rows.map((r) => [`${r.section}/${r.name}`, r]));

assert.equal(by["CPU/Cores"].status, "SAME");
assert.deepEqual(by["Display/Width"], { section: "Display", name: "Width", status: "CHANGED", before: "1440", after: "1920" });
assert.equal(by["CPU/Added"].status, "NEW");
assert.equal(by["CPU/Old"].status, "GONE");
// unavailable on both sides is stable, not a change
assert.equal(by["Display/Memory"].status, "SAME");

// SAME=2 (Cores, Memory), CHANGED=1 (Width); NEW/GONE not counted
assert.deepEqual(stability(rows), { same: 2, compared: 3, percent: 67 });
assert.equal(stability([]).percent, 0);

assert.equal(parseSnapshot(JSON.stringify({ version: "0.9.0", exportedAt: "x", sections: after })).sections.length, 2);
assert.throws(() => parseSnapshot("{}"), /not a fingerprint export/);
assert.throws(() => parseSnapshot("[]"), /not a fingerprint export/);

console.log("diff: ok");
