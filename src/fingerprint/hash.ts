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
