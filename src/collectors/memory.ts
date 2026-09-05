import { result, unavailable, type Section } from "../types";

const mb = (bytes: number) => `${Math.round(bytes / 1048576)} MB`;

export function collectMemory(): Section {
  const heap = performance.memory;
  return {
    title: "Memory",
    note: "Device memory is bucketed on purpose, not your installed RAM. The heap figures describe this tab's JavaScript, not the machine, and Chromium quantises them.",
    results: [
      result("Reported device memory", navigator.deviceMemory && `${navigator.deviceMemory} GB`, "COARSE"),
      result("JS heap limit", heap && mb(heap.jsHeapSizeLimit), "COARSE"),
      result("JS heap total", heap && mb(heap.totalJSHeapSize), "COARSE"),
      result("JS heap used", heap && mb(heap.usedJSHeapSize), "COARSE"),
      unavailable("Exact RAM size"),
      unavailable("RAM manufacturer"),
      unavailable("RAM frequency"),
      unavailable("RAM module count"),
    ],
  };
}
