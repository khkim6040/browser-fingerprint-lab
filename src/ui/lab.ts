import type { Section } from "../types";
import { diff, parseSnapshot, stability, type DiffRow, type Snapshot } from "../lab/diff";

function download(snapshot: Snapshot): void {
  const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `fingerprint-${snapshot.exportedAt.slice(0, 19).replace(/[:T]/g, "-")}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function diffRow(r: DiffRow): HTMLElement {
  const el = document.createElement("div");
  el.className = "row";

  const name = document.createElement("span");
  name.className = "name";
  name.textContent = `${r.section} / ${r.name}`;

  const value = document.createElement("span");
  value.className = "value";
  if (r.status === "CHANGED") value.textContent = `${r.before} → ${r.after}`;
  else if (r.status === "NEW") value.textContent = r.after ?? "";
  else if (r.status === "GONE") value.textContent = r.before ?? "";

  const badge = document.createElement("span");
  badge.className = `badge ${r.status.toLowerCase()}`;
  badge.textContent = r.status;

  el.append(name, value, badge);
  return el;
}

function renderDiff(root: HTMLElement, before: Snapshot, after: Section[]): void {
  const rows = diff(before.sections, after);
  const s = stability(rows);
  const el = document.createElement("section");
  const h = document.createElement("h2");
  h.textContent = "Stability Lab";
  const note = document.createElement("p");
  note.className = "note";
  note.textContent =
    `${s.same} of ${s.compared} signals identical (${s.percent}%) ` +
    `vs snapshot from ${before.exportedAt}` +
    (before.version ? ` (v${before.version})` : "");
  el.append(h, note, ...rows.map(diffRow));
  root.replaceChildren(el);
}

function renderError(root: HTMLElement, message: string): void {
  const p = document.createElement("p");
  p.className = "note error";
  p.textContent = message;
  root.replaceChildren(p);
}

/** Toolbar: Export current results as JSON, Import a previous export to diff against. */
export function mountLab(toolbar: HTMLElement, output: HTMLElement, sections: Section[], version: string): void {
  const exportBtn = document.createElement("button");
  exportBtn.textContent = "Export JSON";
  exportBtn.onclick = () => download({ version, exportedAt: new Date().toISOString(), sections });

  const importLabel = document.createElement("label");
  importLabel.className = "button";
  importLabel.textContent = "Import JSON to compare";
  const file = document.createElement("input");
  file.type = "file";
  file.accept = ".json,application/json";
  file.onchange = async () => {
    const f = file.files?.[0];
    if (!f) return;
    try {
      renderDiff(output, parseSnapshot(await f.text()), sections);
    } catch (e) {
      renderError(output, `Could not read ${f.name}: ${e instanceof Error ? e.message : String(e)}`);
    }
    file.value = "";
  };
  importLabel.append(file);

  toolbar.replaceChildren(exportBtn, importLabel);
}
