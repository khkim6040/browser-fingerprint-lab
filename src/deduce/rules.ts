import type { Section } from "../types.ts";
import { APPLE_CHIPS, GPU_CLASSES, PANELS } from "./tables.ts";

export interface Deduction {
  name: string;
  value: string;
  /** "Section/Signal" keys this conclusion leaned on. */
  evidence: string[];
}

/** "Section/Signal" → the row's value when supported, else undefined. */
export type Get = (key: string) => unknown;

/** What earlier rules established, for later rules and the verdict. */
interface Facts {
  os?: string;
  chip?: string;
  products?: string[];
  minRam?: number;
  ramGb?: number;
  display?: string;
  external?: boolean;
  panelProducts?: string[];
  place?: string;
}

type Rule = (get: Get, f: Facts) => Deduction | undefined;

const str = (get: Get, key: string): string | undefined => {
  const v = get(key);
  return v === undefined || v === null ? undefined : String(v);
};
const num = (get: Get, key: string): number | undefined => {
  const v = get(key);
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : undefined;
};
/** "1920 x 1080" → [1920, 1080] */
const size = (get: Get, key: string): [number, number] | undefined => {
  const m = /(\d+) x (\d+)/.exec(str(get, key) ?? "");
  return m ? [+m[1], +m[2]] : undefined;
};
const list = (xs: string[], word = "or"): string =>
  xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} ${word} ${xs[xs.length - 1]}`;

const displayName = (type: "language" | "region", code: string): string => {
  try {
    return new Intl.DisplayNames(["en"], { type }).of(code) ?? code;
  } catch {
    return code;
  }
};

/** "GMT+9" for an IANA zone; undefined when this runtime does not know the zone. */
function offset(tz: string): string | undefined {
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset" })
      .formatToParts(new Date())
      .find((p) => p.type === "timeZoneName")?.value;
  } catch {
    return undefined;
  }
}

/** OS family from UA-CH platform (Chromium) or navigator.platform + UA (the rest). iOS before macOS: its UA says "like Mac OS X". */
export function osFamily(get: Get): string | undefined {
  const p = `${str(get, "Environment/OS") ?? ""} ${str(get, "Environment/User agent") ?? ""}`;
  if (/Android/i.test(p)) return "Android";
  if (/iPhone|iPad|iPod/.test(p)) return "iOS";
  if (/Mac/i.test(p)) return "macOS";
  if (/Win/i.test(p)) return "Windows";
  if (/CrOS|Chrome OS/i.test(p)) return "ChromeOS";
  if (/Linux|X11/i.test(p)) return "Linux";
  return str(get, "Environment/OS");
}

/** "ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Laptop GPU (0x000028A0) Direct3D11 vs_5_0 ps_5_0, D3D11)" → "NVIDIA GeForce RTX 4070 Laptop GPU". */
export function gpuModel(renderer: string): string {
  const angle = /^ANGLE \((.*)\)$/.exec(renderer);
  let s = angle ? angle[1] : renderer;
  const parts = s.split(", ");
  if (angle && parts.length >= 2) s = parts[1]; // vendor, MODEL, backend
  return s
    .replace(/\s*\(0x[0-9A-Fa-f]+\)/g, "")
    .replace(/\s*Direct3D\d+.*$/, "")
    .replace(/^Mesa\s+/, "")
    .replace(/\s*\([^()]*\)$/, "") // trailing "(radeonsi, navi22, …)" / "(KBL GT2)"
    .replace(/\/PCIe\/SSE2$/, "")
    .trim();
}

const machine: Rule = (get, f) => {
  const renderer = str(get, "WebGL/Unmasked renderer") ?? "";
  const os = (f.os = osFamily(get));
  const cores = num(get, "CPU/Logical processors");
  const touch = num(get, "Input/Touch points") ?? 0;
  const ev = ["WebGL/Unmasked renderer", "CPU/Logical processors", "Environment/OS"];

  const formFactors = String(get("Environment/Form factors") ?? "");
  if (get("Environment/Mobile") === true || /Mobile|Tablet/.test(formFactors) || os === "Android" || os === "iOS") {
    const model = str(get, "Environment/Model");
    const value =
      os === "iOS" ? "an iPhone or iPad; Safari names no model"
      : model ? `an ${os} phone or tablet, model ${model}`
      : `an ${os} phone or tablet; the model is withheld`;
    return { name: "Machine", value, evidence: ["Environment/Mobile", "Environment/Model", "Environment/OS"] };
  }
  if (os === "macOS" && touch > 0) {
    return { name: "Machine", value: "an iPad asking to be treated as a Mac: Macintosh platform, but a touchscreen", evidence: ["Environment/Platform (legacy)", "Input/Touch points"] };
  }
  const apple = /Apple (M\d+(?: Pro| Max| Ultra)?)/.exec(renderer);
  if (apple) {
    f.chip = apple[1];
    const rows = APPLE_CHIPS.filter((c) => c.chip === f.chip);
    if (cores === undefined) return { name: "Machine", value: `Apple ${f.chip}; the core count is withheld, so the variant is unknown`, evidence: ev };
    const hit = rows.find((c) => c.cores === cores);
    if (hit) {
      f.products = hit.products;
      f.minRam = hit.minRam;
      return { name: "Machine", value: `Apple ${f.chip}, the ${cores}-core variant — sold as ${list(hit.products)}`, evidence: ev };
    }
    if (rows.length) return { name: "Machine", value: `Apple ${f.chip} with ${cores} cores — a variant this page's table does not list`, evidence: ev };
    return { name: "Machine", value: `Apple ${f.chip} — newer than this page's table`, evidence: ev };
  }
  if (os === "macOS" && (!renderer || /Apple GPU/.test(renderer))) {
    return { name: "Machine", value: "a Mac, most likely Apple Silicon; Safari masks the chip and caps the core count at 8", evidence: ev };
  }
  if (!renderer) return undefined;
  const model = gpuModel(renderer);
  const cls = GPU_CLASSES.find((c) => c.pattern.test(renderer));
  if (cls?.kind === "software") return { name: "Machine", value: `${os ?? "a PC"}: ${cls.conclusion} (${model})`, evidence: ev };
  if (os === "macOS") {
    const value = /Intel|AMD|Radeon/i.test(model) ? `an Intel-era Mac with ${model}` : `a Mac with ${model}`;
    return { name: "Machine", value, evidence: ev };
  }
  return { name: "Machine", value: `${os ?? "a PC"}: ${cls ? cls.conclusion : "a PC"} (${model})`, evidence: ev };
};

const memory: Rule = (get, f) => {
  const bucket = num(get, "Memory/Reported device memory");
  if (bucket === undefined && f.minRam === undefined) return undefined;
  const floor = Math.max(bucket ?? 0, f.minRam ?? 0);
  f.ramGb = floor;
  const why =
    f.minRam && f.minRam > (bucket ?? 0)
      ? bucket
        ? `the browser only admits ≥${bucket} GB, but this chip never ships with less than ${f.minRam} GB`
        : `this browser reports no memory at all, but this chip never ships with less than ${f.minRam} GB`
      : `the browser reports a ${bucket} GB bucket, which is a floor, not the installed amount`;
  const evidence = bucket === undefined ? ["WebGL/Unmasked renderer"] : f.minRam ? ["Memory/Reported device memory", "WebGL/Unmasked renderer"] : ["Memory/Reported device memory"];
  return { name: "Memory", value: `${floor} GB or more — ${why}`, evidence };
};

const display: Rule = (get, f) => {
  const res = size(get, "Display/Resolution");
  const dpr = num(get, "Display/Device pixel ratio");
  if (!res || dpr === undefined) return undefined;
  const gamut = str(get, "Display/Color gamut");
  const ev = ["Display/Resolution", "Display/Device pixel ratio", "Display/Color gamut"];
  const px = `${res[0]}×${res[1]}`;
  if (f.os === "macOS") {
    if (dpr === 1 || gamut === "srgb") {
      f.external = true;
      f.display = `an external ${px} monitor`;
      return { name: "Display", value: `an external non-Apple monitor, ${px} at ${dpr}× — Apple panels are Retina and P3`, evidence: ev };
    }
    const panel = PANELS.find((p) => p.width === res[0] && p.height === res[1]);
    if (panel) {
      f.panelProducts = panel.products;
      f.display = `the ${list(panel.products)} panel`;
      return { name: "Display", value: `the ${list(panel.products)} panel, ${px} at ${dpr}× — Retina, P3`, evidence: ev };
    }
    f.display = "a Retina P3 display";
    return { name: "Display", value: `a Retina P3 display at a custom scaling (${px} at ${dpr}×); no stock panel matches`, evidence: ev };
  }
  f.display = `a ${px} screen`;
  const value = dpr === 1 ? `a ${px} screen at 100%` : `a ${px} screen scaled at ${Math.round(dpr * 100)}%`;
  return { name: "Display", value, evidence: ev };
};

const desk: Rule = (get, f) => {
  const res = size(get, "Display/Resolution");
  const avail = size(get, "Display/Available");
  const win = size(get, "Display/Window outer size");
  if (!res || !avail || !win) return undefined;
  const parts: string[] = [];
  if (f.os === "macOS") {
    if (res[0] > avail[0]) parts.push("Dock on the left or right");
    else if (res[1] - avail[1] > 40) parts.push("Dock at the bottom");
    else parts.push("no Dock on this screen: hidden, or on another display");
  }
  // Chrome's maximised window comes up a pixel short of the available area.
  parts.push(win[0] >= avail[0] - 2 && win[1] >= avail[1] - 2 ? "the browser fills the screen" : `browser windowed, ${win[0]}×${win[1]} of ${avail[0]}×${avail[1]}`);
  return { name: "Desk", value: parts.join("; "), evidence: ["Display/Resolution", "Display/Available", "Display/Window outer size"] };
};

const where: Rule = (get, f) => {
  const clock = str(get, "Environment/Timezone");
  const country = str(get, "Server/Country");
  if (!country) return clock ? { name: "Where", value: `IP location unavailable here; the clock says ${clock}`, evidence: ["Environment/Timezone"] } : undefined;
  const city = str(get, "Server/City");
  const ipTz = str(get, "Server/IP timezone");
  f.place = [city, displayName("region", country)].filter(Boolean).join(", ");
  const ev = ["Server/City", "Server/Country", "Server/IP timezone", "Environment/Timezone"];
  if (!clock || !ipTz) return { name: "Where", value: `${f.place} by IP address`, evidence: ev };
  if (clock === ipTz) return { name: "Where", value: `${f.place} by IP address; the browser clock agrees (${clock}), so no sign of a VPN or proxy`, evidence: ev };
  if (offset(clock) && offset(clock) === offset(ipTz)) {
    return { name: "Where", value: `${f.place} by IP address; the clock (${clock}) and the IP (${ipTz}) keep the same time`, evidence: ev };
  }
  return { name: "Where", value: `the clock says ${clock} but the IP sits in ${ipTz} (${f.place}) — VPN, proxy, or travelling`, evidence: ev };
};

const languages: Rule = (get) => {
  const langs = get("Environment/Languages");
  if (!Array.isArray(langs) || langs.length === 0) return undefined;
  const first = String(langs[0]);
  const base = (tag: string) => tag.split("-")[0];
  const others = [...new Set(langs.slice(1).map((l) => base(String(l))))]
    .filter((b) => b !== base(first))
    .map((b) => displayName("language", b));
  let value = `browser in ${displayName("language", first)}`;
  if (others.length) value += `; also reads ${list(others, "and")}`;
  const ev = ["Environment/Languages"];
  const region = first.split("-")[1];
  const country = str(get, "Server/Country");
  if (region && country && region.toUpperCase() !== country.toUpperCase()) {
    value += ` — ${/^[aeiou]/i.test(displayName("language", base(first))) ? "an" : "a"} ${displayName("language", base(first))} UI in ${displayName("region", country)}`;
    ev.push("Server/Country");
  }
  return { name: "Languages", value, evidence: ev };
};

const connection: Rule = (get) => {
  const ttfb = num(get, "Network/Time to first byte");
  if (ttfb === undefined) return undefined;
  const edge = str(get, "Server/Edge region");
  const from = edge ? `Vercel's ${edge} edge` : "the nearest edge";
  const verdict = ttfb < 20 ? "same metro area" : ttfb < 60 ? "same region" : "far from it, or a slow link";
  return { name: "Connection", value: `${ttfb.toFixed(0)} ms to first byte from ${from}: ${verdict}`, evidence: edge ? ["Network/Time to first byte", "Server/Edge region"] : ["Network/Time to first byte"] };
};

/** One sentence from what the rules established. */
function verdict(f: Facts, ds: Deduction[]): Deduction | undefined {
  const machine = ds.find((d) => d.name === "Machine");
  if (!machine && !f.display) return undefined;
  let what: string;
  if (f.products) {
    const both = f.panelProducts ? f.products.filter((p) => f.panelProducts!.includes(p)) : [];
    const products = both.length ? both : f.products;
    what = list(products.map((p) => (f.external && /MacBook/.test(p) ? `a docked ${p}` : `a ${p}`)));
    what += ` (${f.chip}${f.ramGb ? `, ${f.ramGb} GB+` : ""})`;
  } else {
    what = machine?.value ?? "a computer";
  }
  const bits = [what];
  if (f.display) bits.push(`on ${f.display}`);
  if (f.place) bits.push(`in ${f.place}`);
  return { name: "Verdict", value: `Probably ${bits.join(", ")}.`, evidence: [...new Set(ds.flatMap((d) => d.evidence))] };
}

/** Append a rule here to add a deduction; it reads rows through get() and names them as evidence. */
const RULES: Rule[] = [machine, memory, display, desk, where, languages, connection];

export function deduce(sections: Section[]): Deduction[] {
  const rows = new Map<string, unknown>();
  const allKeys = new Set<string>();
  for (const s of sections) for (const r of s.results) {
    allKeys.add(`${s.title}/${r.name}`);
    if (r.supported) rows.set(`${s.title}/${r.name}`, r.value);
  }
  const get: Get = (key) => rows.get(key);
  const facts: Facts = {};
  const out: Deduction[] = [];
  for (const rule of RULES) {
    const d = rule(get, facts);
    if (d) out.push(d);
  }
  const v = verdict(facts, out);
  const all = v ? [v, ...out] : out;
  // A rule's `ev` is built unconditionally before it knows which branch it will
  // return from, so it can name a row (e.g. "WebGL/Unmasked renderer") that this
  // export never had at all. Drop those here, once, for every deduction including Verdict.
  return all.map((d) => ({ ...d, evidence: d.evidence.filter((k) => allKeys.has(k)) }));
}
