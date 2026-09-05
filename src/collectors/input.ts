import { result, type Section } from "../types";
import { mq, mqRow } from "./display";

const POINTER = ["fine", "coarse", "none"];
const HOVER = ["hover", "none"];

/** Pointer class, hover ability and touch count → the kind of machine this most likely is. */
function likelyInput(touch: number, pointer: string | undefined, hover: string | undefined): string {
  if (pointer === "coarse" && touch > 0) return "touchscreen device — phone or tablet";
  if (pointer === "fine" && hover === "hover") {
    return touch > 0 ? "laptop or desktop with a touchscreen" : "desktop or laptop — mouse or trackpad, no touch";
  }
  return "unclear";
}

export function collectInput(): Section {
  const touch = navigator.maxTouchPoints;
  const pointer = mq("pointer", POINTER);
  const hover = mq("hover", HOVER);
  return {
    title: "Input",
    results: [
      result("Touch points", touch),
      // Capability classes, not device names: the browser buckets the hardware.
      result("Pointer", pointer, "COARSE"),
      mqRow("Any pointer", "any-pointer", POINTER, "COARSE"),
      result("Hover", hover, "COARSE"),
      mqRow("Any hover", "any-hover", HOVER, "COARSE"),
      result("Likely input environment", likelyInput(touch, pointer, hover), "INFERRED"),
    ],
  };
}
