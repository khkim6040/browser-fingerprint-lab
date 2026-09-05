/**
 * Fixed-size CPU workloads. Each returns a checksum so a run can be verified,
 * and each is sized (SIZES) to take a few milliseconds on a fast laptop.
 */

/** 32-bit LCG; the wasm module runs the identical recurrence. */
export function integer(n: number): number {
  let a = 0;
  for (let i = 0; i < n; i++) a = (Math.imul(a, 1664525) + 1013904223) | 0;
  return a;
}

export function float(n: number): number {
  let x = 0;
  for (let i = 1; i <= n; i++) x += Math.sqrt(i) * Math.sin(i);
  return x;
}

/** Sorts n pseudo-random numbers; the median is the checksum. */
export function sort(n: number): number {
  let seed = 42;
  const arr = Array.from({ length: n }, () => (seed = (Math.imul(seed, 1664525) + 1013904223) | 0));
  arr.sort((a, b) => a - b);
  return arr[n >> 1];
}

/** FNV-1a over n synthetic bytes. */
export function hash(n: number): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < n; i++) h = Math.imul(h ^ (i & 0xff), 0x01000193);
  return h >>> 0;
}

/** Round-trips n small objects through JSON. */
export function json(n: number): number {
  const items = Array.from({ length: n }, (_, i) => ({ id: i, name: `item-${i}`, tags: ["a", "b"], ok: i % 2 === 0 }));
  return JSON.parse(JSON.stringify({ items })).items.length;
}

/** Dense n×n multiply. */
export function matrix(n: number): number {
  const a = new Float64Array(n * n);
  const b = new Float64Array(n * n);
  const c = new Float64Array(n * n);
  for (let i = 0; i < n * n; i++) {
    a[i] = (i % 7) + 1;
    b[i] = (i % 5) + 1;
  }
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < n; k++) {
      const aik = a[i * n + k];
      for (let j = 0; j < n; j++) c[i * n + j] += aik * b[k * n + j];
    }
  }
  return c[n * n - 1];
}

/** Iteration counts: a few ms each on an M-series laptop; `scaling` is the per-worker job. */
export const SIZES = {
  integer: 8_000_000,
  float: 600_000,
  sort: 50_000,
  hash: 8_000_000,
  json: 20_000,
  matrix: 160,
  scaling: 32_000_000,
};
