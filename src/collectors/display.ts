import { result, type Section } from "../types";

export function collectDisplay(): Section {
  return {
    title: "Display",
    results: [
      result("Resolution", `${screen.width} x ${screen.height}`),
      result("Available", `${screen.availWidth} x ${screen.availHeight}`),
      result("Color depth", screen.colorDepth),
      result("Pixel depth", screen.pixelDepth),
      result("Device pixel ratio", devicePixelRatio),
      result("Viewport", `${innerWidth} x ${innerHeight}`),
      result("Window outer size", `${outerWidth} x ${outerHeight}`),
      result("Orientation", screen.orientation?.type),
    ],
  };
}
