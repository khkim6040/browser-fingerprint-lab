import { result, type Section } from "../types";

export function collectMemory(): Section {
  return {
    title: "Memory",
    results: [
      // Bucketed to a coarse power-of-two figure, precisely so it cannot
      // identify the machine. Not the real installed RAM.
      result(
        "Reported device memory",
        navigator.deviceMemory && `${navigator.deviceMemory} GB`,
        "COARSE",
      ),
    ],
  };
}
