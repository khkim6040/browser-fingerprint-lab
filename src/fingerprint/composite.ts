import type { Section } from "../types";

/** Which sections feed which category hash (roadmap Phase 17). Network and Storage are connection- and disk-state, not the device. */
export const CATEGORIES: Record<string, string[]> = {
  Hardware: ["CPU", "Memory", "WebGL", "WebGPU", "Display", "Input", "Media"],
  Rendering: ["Rendering"],
  Audio: ["Audio"],
  Environment: ["Environment", "Browser APIs"],
};

/** Signals that move between two loads on the same machine; they would only add noise. */
const VOLATILE = new Set([
  "CPU/Single-thread score",
  "CPU/Benchmark breakdown",
  "CPU/Worker scaling",
  "CPU/Effective parallelism",
  "Memory/JS heap total",
  "Memory/JS heap used",
  "Display/Viewport",
  "Display/Window outer size",
  "Display/Orientation",
  "Display/Frame interval",
  "Display/Estimated refresh rate",
  "Audio/Output latency",
  "Audio/Context state",
]);

/**
 * Canonical text per category: sorted "Section/Signal=value" lines. The value
 * rule matches lab/diff.ts, so what the Stability Lab calls SAME hashes the same.
 */
export function canonical(
  sections: Section[],
  groups: Record<string, string[]> = CATEGORIES,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [category, titles] of Object.entries(groups)) {
    const lines: string[] = [];
    for (const s of sections) {
      if (!titles.includes(s.title)) continue;
      for (const r of s.results) {
        const key = `${s.title}/${r.name}`;
        if (VOLATILE.has(key)) continue;
        lines.push(`${key}=${r.supported ? JSON.stringify(r.value) : "unavailable"}`);
      }
    }
    out[category] = lines.sort().join("\n");
  }
  return out;
}

/** "72b8-d919-c402-81ae" from a hex digest. */
export function pretty(hex: string): string {
  return hex.slice(0, 16).match(/.{4}/g)!.join("-");
}
