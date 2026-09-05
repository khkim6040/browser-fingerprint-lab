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
  /** Coarsened by the browser: 0.25 | 0.5 | 1 | 2 | 4 | 8 */
  readonly deviceMemory?: number;
}
