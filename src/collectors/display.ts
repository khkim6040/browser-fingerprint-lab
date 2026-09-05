import { result, type EvidenceType, type Section } from "../types";

/**
 * First matching value for a media feature, or undefined when the browser does
 * not know the feature at all (an unknown feature never matches).
 * Values must be ordered widest-first for the graded features (`color-gamut`,
 * `dynamic-range`), where a wider display also matches the narrower keywords.
 */
function mq(feature: string, values: string[]): string | undefined {
  return values.find((v) => matchMedia(`(${feature}: ${v})`).matches);
}

function mqRow(
  name: string,
  feature: string,
  values: string[],
  evidenceType: EvidenceType,
) {
  return result(name, mq(feature, values), evidenceType);
}

export function collectDisplay(): Section {
  return {
    title: "Display",
    results: [
      result("Resolution", `${screen.width} x ${screen.height}`),
      result("Available", `${screen.availWidth} x ${screen.availHeight}`),
      result("Color depth", screen.colorDepth),
      result("Pixel depth", screen.pixelDepth),
      result("Device pixel ratio", devicePixelRatio),
      result("Viewport", `${innerWidth} x ${innerHeight}`),
      result("Window outer size", `${outerWidth} x ${outerHeight}`),
      result("Orientation", screen.orientation?.type),

      // Hardware described in buckets rather than measured.
      mqRow("Color gamut", "color-gamut", ["rec2020", "p3", "srgb"], "COARSE"),
      mqRow("Dynamic range", "dynamic-range", ["high", "standard"], "COARSE"),
      mqRow("Pointer", "pointer", ["fine", "coarse", "none"], "COARSE"),
      mqRow("Any pointer", "any-pointer", ["fine", "coarse", "none"], "COARSE"),
      mqRow("Hover", "hover", ["hover", "none"], "COARSE"),
      mqRow("Any hover", "any-hover", ["hover", "none"], "COARSE"),

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
