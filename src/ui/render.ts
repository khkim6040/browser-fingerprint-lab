import type { CollectorResult, Section } from "../types";

function format(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function row(r: CollectorResult): HTMLElement {
  const el = document.createElement("div");
  el.className = "row";

  const name = document.createElement("span");
  name.className = "name";
  name.textContent = r.name;

  const value = document.createElement("span");
  value.className = r.supported ? "value" : "value absent";
  value.textContent = r.supported
    ? format(r.value)
    : (r.error ?? "not exposed by this browser");

  const badge = document.createElement("span");
  badge.className = `badge ${r.evidenceType.toLowerCase()}`;
  badge.textContent = r.evidenceType;

  el.append(name, value, badge);
  return el;
}

function sectionEl(s: Section): HTMLElement {
  const el = document.createElement("section");
  const h = document.createElement("h2");
  h.textContent = s.title;
  // How much of this section the current browser gives up: the compatibility indicator.
  const count = document.createElement("span");
  count.className = "count";
  count.textContent = `${s.results.filter((r) => r.supported).length} / ${s.results.length} exposed`;
  h.append(count);
  el.append(h);
  if (s.note) {
    const note = document.createElement("p");
    note.className = "note";
    note.textContent = s.note;
    el.append(note);
  }
  el.append(...s.results.map(row));
  return el;
}

export function render(root: HTMLElement, sections: Section[]): void {
  root.replaceChildren(...sections.map(sectionEl));
}

/** A hue from a 4-hex group: the fingerprint carries its own colour. */
const tint = (hex: string) => `hsl(${parseInt(hex, 16) % 360} 55% 68%)`;

/** Fills the hero with the composite fingerprint and a one-line provenance. */
export function renderHero(root: HTMLElement, sections: Section[], elapsedMs: number): void {
  const composite = sections
    .find((s) => s.title === "Fingerprint")
    ?.results.find((r) => r.name === "Composite");
  const print = root.querySelector<HTMLElement>(".print")!;
  print.classList.remove("pending");
  if (composite?.supported) {
    print.replaceChildren(
      ...String(composite.value)
        .split("-")
        .flatMap((group, i) => {
          const span = document.createElement("span");
          span.textContent = group;
          span.style.color = tint(group);
          return i ? [document.createTextNode("-"), span] : [span];
        }),
    );
  } else {
    print.textContent = composite?.error ?? "unavailable";
  }

  const rows = sections.filter((s) => s.title !== "Fingerprint").flatMap((s) => s.results);
  const exposed = rows.filter((r) => r.supported).length;
  root.querySelector<HTMLElement>(".note")!.textContent =
    `${rows.length} signals read in ${(elapsedMs / 1000).toFixed(1)} s: ${exposed} exposed, ` +
    `${rows.length - exposed} withheld by this browser or never available to any page. Nothing was stored or sent.`;
}
