// Browser APIs that are shipped but not yet in TypeScript's DOM lib.
interface NavigatorUABrandVersion {
  brand: string;
  version: string;
}

interface UADataValues {
  architecture?: string;
  bitness?: string;
  model?: string;
  platform?: string;
  platformVersion?: string;
  formFactors?: string[];
  fullVersionList?: NavigatorUABrandVersion[];
}

interface NavigatorUAData {
  readonly brands: NavigatorUABrandVersion[];
  readonly mobile: boolean;
  readonly platform: string;
  getHighEntropyValues(hints: string[]): Promise<UADataValues>;
}

interface Navigator {
  readonly userAgentData?: NavigatorUAData;
  /** Coarsened by the browser to a power of two (an M4 Pro reported 16). */
  readonly deviceMemory?: number;
}

// WebGPU: shipped in Chromium but not yet in TypeScript's DOM lib.
interface GPUAdapterInfo {
  readonly vendor?: string;
  readonly architecture?: string;
  readonly device?: string;
  readonly description?: string;
}

interface GPUAdapter {
  readonly info?: GPUAdapterInfo;
  readonly features: ReadonlySet<string>;
  /** Named numeric limits, exposed as prototype getters. */
  readonly limits: Record<string, number | undefined>;
  /** Older Chromium shipped the info as a promise before `adapter.info` existed. */
  requestAdapterInfo?(): Promise<GPUAdapterInfo>;
}

interface GPU {
  requestAdapter(): Promise<GPUAdapter | null>;
}

interface Navigator {
  readonly gpu?: GPU;
}

/** Chromium-only JS heap figures, quantised to blunt fingerprinting. */
interface Performance {
  readonly memory?: {
    readonly jsHeapSizeLimit: number;
    readonly totalJSHeapSize: number;
    readonly usedJSHeapSize: number;
  };
}

/** Network Information API: Chromium only, values rounded and noised on purpose. */
interface LabNetworkInformation {
  readonly effectiveType?: string;
  readonly downlink?: number;
  readonly rtt?: number;
  readonly saveData?: boolean;
  readonly type?: string;
}

interface Navigator {
  readonly connection?: LabNetworkInformation;
}

/** package.json version, injected by vite `define` (stamped into JSON exports). */
declare const __APP_VERSION__: string;
