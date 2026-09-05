export type EvidenceType = "DIRECT" | "COARSE" | "INFERRED" | "UNAVAILABLE";

export interface CollectorResult<T = unknown> {
  name: string;
  supported: boolean;
  evidenceType: EvidenceType;
  value?: T;
  error?: string;
}

export interface Section {
  title: string;
  results: CollectorResult[];
  /** Caveat shown under the heading, e.g. values the spec allows a browser to fudge. */
  note?: string;
}

export type Collector = () => Section | Promise<Section>;

/**
 * Builds one result row. A missing value (undefined/null/"" /NaN) is reported as
 * UNAVAILABLE rather than as a supported empty value, so the UI can always tell
 * "the browser refused to say" apart from "the browser said nothing".
 */
export function result<T>(
  name: string,
  value: T | undefined | null,
  evidenceType: EvidenceType = "DIRECT",
): CollectorResult<T> {
  const missing =
    value === undefined ||
    value === null ||
    value === "" ||
    (typeof value === "number" && Number.isNaN(value));
  return missing
    ? { name, supported: false, evidenceType: "UNAVAILABLE" }
    : { name, supported: true, evidenceType, value };
}

/** Wraps a collector so one throwing API cannot blank the whole page. */
export async function guard(title: string, fn: Collector): Promise<Section> {
  try {
    return await fn();
  } catch (e) {
    return {
      title,
      results: [
        {
          name: title,
          supported: false,
          evidenceType: "UNAVAILABLE",
          error: e instanceof Error ? e.message : String(e),
        },
      ],
    };
  }
}

/**
 * A value no web page can read, by browser design (CPU serial, disk model…).
 * Shown as UNAVAILABLE with the reason, so the row reads as a defence, not a gap.
 */
export function unavailable(name: string, reason = "never exposed to web pages"): CollectorResult {
  return { name, supported: false, evidenceType: "UNAVAILABLE", error: reason };
}
