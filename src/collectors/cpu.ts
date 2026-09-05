import { result, unavailable, type Section } from "../types";
import { lcgWasm } from "../bench/wasm";
import { SIZES, float, hash, integer, json, matrix, sort } from "../bench/workloads";

const time = (fn: () => unknown): number => {
  const t = performance.now();
  fn();
  return performance.now() - t;
};

/**
 * Slowest of n workers doing the same fixed job at once, each timing itself. The
 * main thread runs the other collectors meanwhile, so a clock kept there would
 * count their blocking as worker time.
 */
async function wall(n: number): Promise<number> {
  const workers = Array.from(
    { length: n },
    () => new Worker(new URL("../bench/worker.ts", import.meta.url), { type: "module" }),
  );
  const reply = (w: Worker) => new Promise<number>((done) => (w.onmessage = (e) => done(e.data.ms)));
  await Promise.all(workers.map(reply));
  const finished = Promise.all(workers.map(reply));
  workers.forEach((w) => w.postMessage("go"));
  const ms = await finished;
  workers.forEach((w) => w.terminate());
  return Math.max(...ms);
}

/** Throughput relative to one worker at 1, 2, 4, 8… workers, up to the core count. */
async function workerScaling(cores: number): Promise<[number, number][]> {
  const steps = [...new Set([1, 2, 4, 8, 12, 16].filter((n) => n < cores).concat(cores))];
  const one = await wall(1);
  const out: [number, number][] = [[1, 1]];
  for (const n of steps.slice(1)) out.push([n, (n * one) / (await wall(n))]);
  return out;
}

export async function collectCpu(): Promise<Section> {
  const cores = navigator.hardwareConcurrency;
  // Main-thread work first and synchronously, so it is over before the other
  // collectors (frame-interval sampling in Display) start measuring.
  const wasm = lcgWasm();
  const timings: [string, number][] = [
    ["integer", time(() => integer(SIZES.integer))],
    ["float", time(() => float(SIZES.float))],
    ["sort", time(() => sort(SIZES.sort))],
    ["hash", time(() => hash(SIZES.hash))],
    ["json", time(() => json(SIZES.json))],
    ["matrix", time(() => matrix(SIZES.matrix))],
    ["wasm", time(() => wasm(SIZES.integer))],
  ];
  const total = timings.reduce((sum, [, ms]) => sum + ms, 0);
  const scaling = typeof Worker === "undefined" || !cores ? undefined : await workerScaling(cores);
  const parallelism = scaling && Math.max(...scaling.map(([, x]) => x));

  return {
    title: "CPU",
    note: "Scores are timings of fixed work, so they move with thermal state, power mode, other tabs and browser version: a rough tier, not a model number. Worker scaling shows how many cores the browser really gives a page.",
    results: [
      result("Logical processors", cores),
      result("Single-thread score", Math.round(10_000 / total), "INFERRED"),
      result("Benchmark breakdown", timings.map(([name, ms]) => `${name} ${ms.toFixed(1)} ms`), "INFERRED"),
      result("Worker scaling", scaling?.map(([n, x]) => `${n}× → ${x.toFixed(1)}`), "INFERRED"),
      result("Effective parallelism", parallelism && `~${parallelism.toFixed(1)} of ${cores}`, "INFERRED"),
      unavailable("CPU model"),
      unavailable("CPU clock speed"),
      unavailable("Physical cores"),
      unavailable("CPU serial"),
    ],
  };
}
