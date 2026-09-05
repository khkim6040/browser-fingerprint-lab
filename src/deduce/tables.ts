/**
 * Data only. Product names are shared between APPLE_CHIPS and PANELS so the
 * verdict can intersect "what this chip ships in" with "what panel this is" by name.
 * Adding a chip, a panel or a GPU pattern is one record here; rules.ts does not change.
 */

export interface AppleChip {
  chip: string;
  cores: number;
  products: string[];
  /** Smallest memory configuration Apple sells this variant with, GB. */
  minRam: number;
}

export const APPLE_CHIPS: AppleChip[] = [
  { chip: "M1", cores: 8, products: ["MacBook Air 13", "MacBook Pro 13", "Mac mini", "iMac 24"], minRam: 8 },
  { chip: "M1 Pro", cores: 8, products: ["MacBook Pro 14"], minRam: 16 },
  { chip: "M1 Pro", cores: 10, products: ["MacBook Pro 14", "MacBook Pro 16"], minRam: 16 },
  { chip: "M1 Max", cores: 10, products: ["MacBook Pro 14", "MacBook Pro 16", "Mac Studio"], minRam: 32 },
  { chip: "M1 Ultra", cores: 20, products: ["Mac Studio"], minRam: 64 },
  { chip: "M2", cores: 8, products: ["MacBook Air 13", "MacBook Air 15", "MacBook Pro 13", "Mac mini"], minRam: 8 },
  { chip: "M2 Pro", cores: 10, products: ["MacBook Pro 14", "Mac mini"], minRam: 16 },
  { chip: "M2 Pro", cores: 12, products: ["MacBook Pro 14", "MacBook Pro 16", "Mac mini"], minRam: 16 },
  { chip: "M2 Max", cores: 12, products: ["MacBook Pro 14", "MacBook Pro 16", "Mac Studio"], minRam: 32 },
  { chip: "M2 Ultra", cores: 24, products: ["Mac Studio", "Mac Pro"], minRam: 64 },
  { chip: "M3", cores: 8, products: ["MacBook Air 13", "MacBook Air 15", "MacBook Pro 14", "iMac 24"], minRam: 8 },
  { chip: "M3 Pro", cores: 11, products: ["MacBook Pro 14"], minRam: 18 },
  { chip: "M3 Pro", cores: 12, products: ["MacBook Pro 14", "MacBook Pro 16"], minRam: 18 },
  { chip: "M3 Max", cores: 14, products: ["MacBook Pro 14", "MacBook Pro 16"], minRam: 36 },
  { chip: "M3 Max", cores: 16, products: ["MacBook Pro 14", "MacBook Pro 16"], minRam: 36 },
  { chip: "M3 Ultra", cores: 28, products: ["Mac Studio"], minRam: 96 },
  { chip: "M3 Ultra", cores: 32, products: ["Mac Studio"], minRam: 96 },
  { chip: "M4", cores: 8, products: ["iMac 24"], minRam: 16 },
  { chip: "M4", cores: 10, products: ["MacBook Air 13", "MacBook Air 15", "MacBook Pro 14", "Mac mini", "iMac 24"], minRam: 16 },
  { chip: "M4 Pro", cores: 12, products: ["MacBook Pro 14", "Mac mini"], minRam: 24 },
  { chip: "M4 Pro", cores: 14, products: ["MacBook Pro 14", "MacBook Pro 16", "Mac mini"], minRam: 24 },
  { chip: "M4 Max", cores: 14, products: ["MacBook Pro 14", "MacBook Pro 16", "Mac Studio"], minRam: 36 },
  { chip: "M4 Max", cores: 16, products: ["MacBook Pro 14", "MacBook Pro 16", "Mac Studio"], minRam: 36 },
  { chip: "M5", cores: 10, products: ["MacBook Pro 14"], minRam: 16 },
];

export interface Panel {
  /** Logical (CSS pixel) size at the display's default scaling. */
  width: number;
  height: number;
  products: string[];
}

export const PANELS: Panel[] = [
  { width: 1440, height: 900, products: ["MacBook Air 13", "MacBook Pro 13"] },
  { width: 1470, height: 956, products: ["MacBook Air 13"] },
  { width: 1710, height: 1112, products: ["MacBook Air 15"] },
  { width: 1512, height: 982, products: ["MacBook Pro 14"] },
  { width: 1728, height: 1117, products: ["MacBook Pro 16"] },
  { width: 2240, height: 1260, products: ["iMac 24"] },
  { width: 2560, height: 1440, products: ["Studio Display"] },
  { width: 3008, height: 1692, products: ["Pro Display XDR"] },
];

export type GpuKind = "software" | "laptop" | "discrete" | "integrated";

export interface GpuClass {
  pattern: RegExp;
  kind: GpuKind;
  conclusion: string;
}

/** Tested in order against the unmasked renderer string; the first match wins. */
export const GPU_CLASSES: GpuClass[] = [
  { pattern: /SwiftShader|llvmpipe|Basic Render Driver/i, kind: "software", conclusion: "software rendering: a VM, remote desktop, or headless browser" },
  { pattern: /Laptop GPU|Max-Q|Mobile/i, kind: "laptop", conclusion: "a laptop with a discrete GPU" },
  { pattern: /GeForce|Radeon RX|Radeon Pro|Arc(\(TM\))? [AB]\d|Quadro/i, kind: "discrete", conclusion: "a desktop or gaming laptop" },
  { pattern: /Iris|UHD Graphics|HD Graphics|Radeon(\(TM\))? Graphics|Radeon Vega|Arc(\(TM\))? Graphics|Adreno/i, kind: "integrated", conclusion: "a laptop or small-form-factor PC" },
];
