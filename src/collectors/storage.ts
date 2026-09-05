import { result, unavailable, type Section } from "../types";

const mbytes = (bytes: number) => `${(bytes / 1e6).toFixed(1)} MB`;
const gbytes = (bytes: number) => `${(bytes / 1e9).toFixed(1)} GB`;

export async function collectStorage(): Promise<Section> {
  // Absent in insecure contexts; a rejected estimate just blanks the two rows.
  const est = await navigator.storage?.estimate().catch(() => undefined);
  return {
    title: "Storage",
    note: "Quota is what the browser would let this origin store — usually a slice of free disk space, so it hints at the disk without naming it. The disk itself is off limits.",
    results: [
      result("Origin storage usage", est?.usage !== undefined ? mbytes(est.usage) : undefined),
      result("Origin storage quota", est?.quota !== undefined ? gbytes(est.quota) : undefined, "COARSE"),
      unavailable("Physical disk size"),
      unavailable("Disk model"),
      unavailable("Free disk space"),
      unavailable("Filesystem"),
      unavailable("Disk serial"),
      unavailable("Disk manufacturer"),
    ],
  };
}
