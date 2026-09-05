import assert from "node:assert/strict";
import { canonical, pretty } from "./composite.ts";
import type { Section } from "../types.ts";

const sections: Section[] = [
  { title: "CPU", results: [
    { name: "Logical processors", supported: true, evidenceType: "DIRECT", value: 12 },
    { name: "Single-thread score", supported: true, evidenceType: "INFERRED", value: 164 },
    { name: "CPU model", supported: false, evidenceType: "UNAVAILABLE", error: "never exposed to web pages" },
  ] },
  { title: "Audio", results: [{ name: "Sample rate", supported: true, evidenceType: "DIRECT", value: "48000 Hz" }] },
  { title: "Network", results: [{ name: "Online", supported: true, evidenceType: "DIRECT", value: true }] },
  { title: "WebGL", results: [{ name: "Max texture size", supported: true, evidenceType: "DIRECT", value: 16384 }] },
];
const c = canonical(sections);

// Grouped by category, sorted, volatile signals dropped, unsupported rows kept as "unavailable".
assert.equal(c.Hardware, 'CPU/CPU model=unavailable\nCPU/Logical processors=12\nWebGL/Max texture size=16384');
assert.equal(c.Audio, 'Audio/Sample rate="48000 Hz"');
// Sections outside every category (Network) never reach a hash; empty categories are empty strings.
assert.ok(!Object.values(c).some((t) => t.includes("Network")));
assert.equal(c.Rendering, "");

// Custom groups: a sub-hash over just the GPU sections.
assert.deepEqual(canonical(sections, { GPU: ["WebGL", "WebGPU"] }), { GPU: "WebGL/Max texture size=16384" });

assert.equal(pretty("72b8d919c40281ae0000"), "72b8-d919-c402-81ae");
console.log("composite: ok");
