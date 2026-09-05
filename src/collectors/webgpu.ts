import { result, type Section } from "../types";

const NOTE =
  "The spec lets a browser tier, round, or blank these values to limit fingerprinting, " +
  "so they describe a reported class of device rather than the exact hardware.";

/** Spec limit names, shown verbatim so they can be looked up in the WebGPU spec. */
const LIMITS = [
  "maxTextureDimension2D",
  "maxTextureDimension3D",
  "maxBufferSize",
  "maxBindGroups",
  "maxStorageBufferBindingSize",
  "maxComputeWorkgroupStorageSize",
  "maxComputeInvocationsPerWorkgroup",
];

export async function collectWebgpu(): Promise<Section> {
  if (!navigator.gpu) {
    return { title: "WebGPU", results: [result("WebGPU", undefined)] };
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    // The API exists but no adapter was granted (no GPU, or the browser declined).
    return { title: "WebGPU", note: NOTE, results: [result("Adapter", undefined)] };
  }

  const info = adapter.info ?? (await adapter.requestAdapterInfo?.());
  const features = [...adapter.features].sort();

  return {
    title: "WebGPU",
    note: NOTE,
    results: [
      result("Vendor", info?.vendor, "COARSE"),
      result("Architecture", info?.architecture, "COARSE"),
      result("Device", info?.device, "COARSE"),
      result("Description", info?.description, "COARSE"),
      result("Feature count", features.length),
      result("Features", features),
      ...LIMITS.map((name) => result(name, adapter.limits[name], "COARSE")),
    ],
  };
}
