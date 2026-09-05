import { SIZES, integer } from "./workloads";

// Boots, says so, then does one fixed job per "go" and reports back.
// The job's result rides along so the bundler cannot drop the call as dead code.
self.postMessage("ready");
self.onmessage = () => {
  self.postMessage(integer(SIZES.scaling));
};
