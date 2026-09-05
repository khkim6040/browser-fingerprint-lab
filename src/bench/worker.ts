import { SIZES, integer } from "./workloads";

// Boots, says so, then does one fixed job per "go" and reports how long it took.
// The job's result rides along so the bundler cannot drop the call as dead code.
self.postMessage("ready");
self.onmessage = () => {
  const t = performance.now();
  const checksum = integer(SIZES.scaling);
  self.postMessage({ ms: performance.now() - t, checksum });
};
