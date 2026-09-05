import { SIZES, integer } from "./workloads";

// Boots, says so, then does one fixed job per "go" and reports back.
self.postMessage("ready");
self.onmessage = () => {
  integer(SIZES.scaling);
  self.postMessage("done");
};
