import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { deduce, gpuModel, osFamily } from "./rules.ts";
import type { Section } from "../types.ts";

/** Flat "Section/Signal": value → sections, for small inline cases. */
const mk = (rows: Record<string, unknown>): Section[] => {
  const by = new Map<string, Section>();
  for (const [key, value] of Object.entries(rows)) {
    const [title, name] = key.split("/");
    if (!by.has(title)) by.set(title, { title, results: [] });
    by.get(title)!.results.push({ name, supported: true, evidenceType: "DIRECT", value });
  }
  return [...by.values()];
};
const find = (sections: Section[], name: string) => deduce(sections).find((d) => d.name === name)?.value ?? "";

// Every real-device export in fixtures/: expected substrings present, every cited row real.
const dir = new URL("./fixtures/", import.meta.url);
for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
  const { export: snapshot, expect } = JSON.parse(readFileSync(new URL(file, dir), "utf8"));
  const keys = new Set<string>(snapshot.sections.flatMap((s: Section) => s.results.map((r) => `${s.title}/${r.name}`)));
  const ds = deduce(snapshot.sections);
  for (const [name, needles] of Object.entries(expect as Record<string, string[]>)) {
    const d = ds.find((x) => x.name === name);
    assert.ok(d, `${file}: no deduction named ${name}`);
    for (const n of needles) assert.ok(d.value.includes(n), `${file}: ${name} lacks "${n}": ${d.value}`);
  }
  for (const d of ds) for (const k of d.evidence) assert.ok(keys.has(k), `${file}: ${d.name} cites missing row ${k}`);
  assert.equal(ds[0]?.name, "Verdict", `${file}: verdict first`);
}

// Safari on Apple Silicon: renderer masked, cores capped.
const safari = mk({
  "Environment/OS": "MacIntel",
  "Environment/User agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15",
  "WebGL/Unmasked renderer": "Apple GPU",
  "CPU/Logical processors": 8,
  "Input/Touch points": 0,
});
assert.match(find(safari, "Machine"), /Safari masks/);

// Windows laptop with a discrete GPU, HiDPI scaling.
const win = mk({
  "Environment/OS": "Windows",
  "WebGL/Unmasked renderer": "ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Laptop GPU (0x000028A0) Direct3D11 vs_5_0 ps_5_0, D3D11)",
  "CPU/Logical processors": 16,
  "Display/Resolution": "2560 x 1600",
  "Display/Device pixel ratio": 1.5,
});
assert.match(find(win, "Machine"), /Windows: a laptop with a discrete GPU \(NVIDIA GeForce RTX 4070 Laptop GPU\)/);
assert.match(find(win, "Display"), /scaled at 150%/);

// Android phone names its model through UA Client Hints.
const android = mk({ "Environment/OS": "Android", "Environment/Mobile": true, "Environment/Model": "SM-S928B", "Environment/Form factors": ["Mobile"] });
assert.match(find(android, "Machine"), /Android phone or tablet, model SM-S928B/);

// Software renderer means no real GPU in sight.
const vm = mk({ "Environment/OS": "Linux", "WebGL/Unmasked renderer": "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)" });
assert.match(find(vm, "Machine"), /software rendering/);

// IP timezone vs browser clock: mismatch is a VPN tell, same offset is not.
const vpn = mk({ "Environment/Timezone": "Asia/Seoul", "Server/Country": "US", "Server/City": "Los Angeles", "Server/IP timezone": "America/Los_Angeles" });
assert.match(find(vpn, "Where"), /VPN, proxy, or travelling/);
const neighbour = mk({ "Environment/Timezone": "Europe/Berlin", "Server/Country": "FR", "Server/City": "Paris", "Server/IP timezone": "Europe/Paris" });
assert.match(find(neighbour, "Where"), /keep the same time/);
assert.doesNotMatch(find(neighbour, "Where"), /VPN/);
assert.match(find(mk({ "Environment/Timezone": "Asia/Seoul", "Server/Country": "KR", "Server/City": "Seoul", "Server/IP timezone": "Asia/Seoul" }), "Where"), /Seoul, South Korea by IP address; the browser clock agrees/);

// Language UI vs IP country.
assert.match(find(mk({ "Environment/Languages": ["en-US", "ko-KR", "ko"], "Server/Country": "KR" }), "Languages"), /browser in American English; also reads Korean — an English UI in South Korea/);

// Renderer string cleanup and OS detection.
assert.equal(gpuModel("ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Laptop GPU (0x000028A0) Direct3D11 vs_5_0 ps_5_0, D3D11)"), "NVIDIA GeForce RTX 4070 Laptop GPU");
assert.equal(gpuModel("Mesa Intel(R) UHD Graphics 620 (KBL GT2)"), "Intel(R) UHD Graphics 620");
assert.equal(gpuModel("AMD Radeon RX 6700 XT (radeonsi, navi22, LLVM 15.0.7, DRM 3.49, 6.2.0)"), "AMD Radeon RX 6700 XT");
assert.equal(osFamily((k) => ({ "Environment/OS": "iPhone", "Environment/User agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X)" })[k]), "iOS");
assert.equal(osFamily((k) => ({ "Environment/OS": "X11", "Environment/User agent": "Mozilla/5.0 (X11; CrOS x86_64 16000.0.0)" })[k]), "ChromeOS");

// Nothing to go on → nothing claimed.
assert.deepEqual(deduce([]), []);
console.log("rules: ok");
