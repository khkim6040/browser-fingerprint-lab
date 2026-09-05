import { result, unavailable, type CollectorResult, type Section } from "../types";

const ms = (from: number, to: number) => `${(to - from).toFixed(1)} ms`;

/**
 * The biggest thing this page already downloaded (the JS bundle) as a crude
 * throughput probe. Nothing extra is fetched, so a few KB is all there is.
 * A cached body reports a transfer of 0 (or ~300 bytes of headers in Chromium),
 * so the body has to be bigger than the transfer for the timing to mean anything.
 */
function throughput(): CollectorResult {
  const biggest = (performance.getEntriesByType("resource") as PerformanceResourceTiming[])
    .sort((a, b) => b.encodedBodySize - a.encodedBodySize)[0];
  if (!biggest || biggest.transferSize <= biggest.encodedBodySize || biggest.responseEnd <= biggest.responseStart)
    return unavailable("Throughput", "served from cache, or transfer sizes withheld — hard-reload to measure");
  const mbps = (biggest.transferSize * 8) / (biggest.responseEnd - biggest.responseStart) / 1000;
  return result("Throughput", `~${mbps.toFixed(1)} Mbps (from a ${(biggest.transferSize / 1024).toFixed(1)} KB transfer)`, "INFERRED");
}

export function collectNetwork(): Section {
  const conn = navigator.connection;
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  return {
    title: "Network",
    note: "Connection figures are rounded and noised by the browser (Chromium only). The timings are of this page's own document load — nothing extra is fetched — so caches, CDN distance and the HTTP version shape them as much as the link does.",
    results: [
      result("Online", navigator.onLine),
      result("Effective type", conn?.effectiveType, "COARSE"),
      result("Downlink", conn?.downlink !== undefined ? `${conn.downlink} Mbps` : undefined, "COARSE"),
      result("Round-trip time", conn?.rtt !== undefined ? `${conn.rtt} ms` : undefined, "COARSE"),
      result("Save data", conn?.saveData),
      result("Connection type", conn?.type, "COARSE"),
      result("Protocol", nav?.nextHopProtocol),
      result("DNS lookup", nav && ms(nav.domainLookupStart, nav.domainLookupEnd), "INFERRED"),
      result("TCP connect", nav && ms(nav.connectStart, nav.connectEnd), "INFERRED"),
      result("TLS handshake", nav?.secureConnectionStart ? ms(nav.secureConnectionStart, nav.connectEnd) : undefined, "INFERRED"),
      result("Time to first byte", nav && ms(nav.requestStart, nav.responseStart), "INFERRED"),
      result("Document download", nav && ms(nav.responseStart, nav.responseEnd), "INFERRED"),
      throughput(),
    ],
  };
}
