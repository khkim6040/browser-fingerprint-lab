import { sha256 } from "../fingerprint/hash";
import { canonical, pretty } from "../fingerprint/composite";
import { result, type Section } from "../types";

/** Not a collector of new data: one hash per category over everything above, and one over those. */
export async function collectFingerprint(sections: Section[]): Promise<Section> {
  const hashes = await Promise.all(
    Object.entries(canonical(sections)).map(async ([category, text]) => [category, await sha256(text)] as const),
  );
  const composite = await sha256(hashes.map(([, h]) => h).join("\n"));
  return {
    title: "Fingerprint",
    note: "SHA-256 over the signals in the sections below, grouped by category, then once more over the four. Nothing here is stored or sent: reload, and the page has to compute it from scratch — which is the point. Signals that move between loads (benchmarks, viewport, heap) are left out.",
    results: [
      ...hashes.map(([category, h]) => result(category, h.slice(0, 16), "INFERRED")),
      result("Composite", pretty(composite), "INFERRED"),
    ],
  };
}
