import type { Section } from "../types";

export type DiffStatus = "SAME" | "CHANGED" | "NEW" | "GONE";

export interface DiffRow {
  section: string;
  name: string;
  status: DiffStatus;
  before?: string;
  after?: string;
}

/** The on-disk shape written by Export and read back by Import. */
export interface Snapshot {
  version: string;
  exportedAt: string;
  sections: Section[];
}

/** Flattens sections into "Section/Name" → comparable string. Errors are ignored: a
 *  collector that threw is "unavailable", same as one the browser refused. */
function flatten(sections: Section[]): Map<string, { section: string; name: string; text: string }> {
  const m = new Map();
  for (const s of sections) {
    for (const r of s.results) {
      m.set(`${s.title}/${r.name}`, {
        section: s.title,
        name: r.name,
        text: r.supported ? JSON.stringify(r.value) : "unavailable",
      });
    }
  }
  return m;
}

/** Signal-level diff, ordered by `after` then by leftover `before` signals. */
export function diff(before: Section[], after: Section[]): DiffRow[] {
  const b = flatten(before);
  const a = flatten(after);
  const rows: DiffRow[] = [];
  for (const [key, cur] of a) {
    const prev = b.get(key);
    if (!prev) rows.push({ section: cur.section, name: cur.name, status: "NEW", after: cur.text });
    else if (prev.text === cur.text) rows.push({ section: cur.section, name: cur.name, status: "SAME" });
    else rows.push({ section: cur.section, name: cur.name, status: "CHANGED", before: prev.text, after: cur.text });
  }
  for (const [key, prev] of b) {
    if (!a.has(key)) rows.push({ section: prev.section, name: prev.name, status: "GONE", before: prev.text });
  }
  return rows;
}

/** Share of signals present on both sides that stayed identical, 0–100. */
export function stability(rows: DiffRow[]): { same: number; compared: number; percent: number } {
  const compared = rows.filter((r) => r.status === "SAME" || r.status === "CHANGED").length;
  const same = rows.filter((r) => r.status === "SAME").length;
  return { same, compared, percent: compared ? Math.round((same / compared) * 100) : 0 };
}

/** Validates a parsed Import file just enough to not crash the diff. */
export function parseSnapshot(json: string): Snapshot {
  const s = JSON.parse(json);
  if (!Array.isArray(s?.sections) || !s.sections.every((x: Section) => typeof x?.title === "string" && Array.isArray(x.results))) {
    throw new Error("not a fingerprint export: missing sections[]");
  }
  return s;
}
