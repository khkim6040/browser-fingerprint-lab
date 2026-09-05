import { result, type EvidenceType, type Section } from "../types";

/**
 * First matching value for a media feature, or undefined when the browser does
 * not know the feature at all (an unknown feature never matches).
 * Values must be ordered widest-first for the graded features (`color-gamut`,
 * `dynamic-range`), where a wider display also matches the narrower keywords.
 */
export function mq(feature: string, values: string[]): string | undefined {
  return values.find((v) => matchMedia(`(${feature}: ${v})`).matches);
}

export function mqRow(
  name: string,
  feature: string,
  values: string[],
  evidenceType: EvidenceType,
) {
  return result(name, mq(feature, values), evidenceType);
}

/** Median gap between animation frames; no API states the refresh rate. */
function frameInterval(frames = 24): Promise<number | undefined> {
  const stamps: number[] = [];
  const sample = new Promise<void>((done) => {
    const tick = (t: number) => {
      if (stamps.push(t) > frames) done();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }).then(() => {
    const gaps = stamps.slice(2).map((t, i) => t - stamps[i + 1]).sort((a, b) => a - b);
    return gaps[gaps.length >> 1];
  });
  // A background tab never gets a frame; give up rather than hang the page.
  const timeout = new Promise<undefined>((done) => setTimeout(() => done(undefined), 2000));
  return Promise.race([sample, timeout]);
}

export async function collectDisplay(): Promise<Section> {
  const interval = await frameInterval();
  return {
    title: "Display",
    note: "Refresh rate is inferred from animation-frame timing, so background tabs, power saving and variable-refresh displays all move it.",
    results: [
      result("Resolution", `${screen.width} x ${screen.height}`),
      result("Available", `${screen.availWidth} x ${screen.availHeight}`),
      result("Color depth", screen.colorDepth),
      result("Pixel depth", screen.pixelDepth),
      result("Device pixel ratio", devicePixelRatio),
      result("Viewport", `${innerWidth} x ${innerHeight}`),
      result("Window outer size", `${outerWidth} x ${outerHeight}`),
      result("Orientation", screen.orientation?.type),
      result("Frame interval", interval && `${interval.toFixed(2)} ms`, "INFERRED"),
      result("Estimated refresh rate", interval && `~${Math.round(1000 / interval)} Hz`, "INFERRED"),

      // Hardware described in buckets rather than measured.
      mqRow("Color gamut", "color-gamut", ["rec2020", "p3", "srgb"], "COARSE"),
      mqRow("Dynamic range", "dynamic-range", ["high", "standard"], "COARSE"),

      // User and OS settings, reported exactly.
      mqRow("Color scheme", "prefers-color-scheme", ["dark", "light"], "DIRECT"),
      mqRow(
        "Contrast preference",
        "prefers-contrast",
        ["more", "less", "custom", "no-preference"],
        "DIRECT",
      ),
      mqRow(
        "Reduced motion",
        "prefers-reduced-motion",
        ["reduce", "no-preference"],
        "DIRECT",
      ),
      mqRow(
        "Reduced transparency",
        "prefers-reduced-transparency",
        ["reduce", "no-preference"],
        "DIRECT",
      ),
      mqRow("Forced colors", "forced-colors", ["active", "none"], "DIRECT"),
    ],
  };
}
