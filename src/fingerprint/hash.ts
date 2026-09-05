/**
 * SHA-256 as lowercase hex. Requires a secure context (https or localhost);
 * elsewhere `crypto.subtle` is undefined and this throws for `guard()` to report.
 */
export async function sha256(data: string | BufferSource): Promise<string> {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

type Drawn = string | BufferSource | undefined;

/**
 * Hashes the output of `draw` twice and compares. A browser that adds per-read
 * noise (Firefox `privacy.resistFingerprinting`, Safari, Brave) gives two
 * different hashes, which is itself the result worth showing — an unstable hash
 * identifies nobody. `draw` may be sync or async.
 */
export async function stableHash(draw: () => Drawn | Promise<Drawn>): Promise<string | undefined> {
  const first = await draw();
  if (first === undefined) return undefined;
  const second = await draw();
  if (second === undefined) return undefined;

  const [a, b] = await Promise.all([sha256(first), sha256(second)]);
  return a === b
    ? a.slice(0, 16)
    : `unstable — redraw gave ${a.slice(0, 16)} then ${b.slice(0, 16)}`;
}
