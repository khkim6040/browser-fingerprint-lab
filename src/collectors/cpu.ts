import { result, type Section } from "../types";

export function collectCpu(): Section {
  return {
    title: "CPU",
    results: [result("Logical processors", navigator.hardwareConcurrency)],
  };
}
