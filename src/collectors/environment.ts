import { result, type Section } from "../types";

const HIGH_ENTROPY_HINTS = [
  "architecture",
  "bitness",
  "model",
  "platform",
  "platformVersion",
  "formFactors",
  "fullVersionList",
];

/** Chromium pads `brands` with a randomised fake entry to break naive UA parsers. */
function isGreased(brand: string): boolean {
  return /not.?a.?brand/i.test(brand);
}

function brandLabel(brands: NavigatorUABrandVersion[] | undefined): string | undefined {
  const real = brands?.filter((b) => !isGreased(b.brand)) ?? [];
  // Chrome reports both "Chromium" and "Google Chrome"; the latter is the useful one.
  const pick = real.find((b) => b.brand !== "Chromium") ?? real[0];
  return pick && `${pick.brand} ${pick.version}`;
}

export async function collectEnvironment(): Promise<Section> {
  const uaData = navigator.userAgentData;

  let hints: UADataValues = {};
  if (uaData) {
    // Rejects (rather than throws) in insecure contexts and when the user agent declines.
    hints = await uaData.getHighEntropyValues(HIGH_ENTROPY_HINTS).catch(() => ({}));
  }

  const intl = Intl.DateTimeFormat().resolvedOptions();

  return {
    title: "Environment",
    results: [
      result("Browser", brandLabel(uaData?.brands)),
      result("OS", hints.platform ?? uaData?.platform ?? navigator.platform),
      result("OS version", hints.platformVersion),
      result("Architecture", hints.architecture),
      result("Bitness", hints.bitness),
      result("Model", hints.model),
      result("Form factors", hints.formFactors),
      result(
        "Full version list",
        hints.fullVersionList
          ?.filter((b) => !isGreased(b.brand))
          .map((b) => `${b.brand} ${b.version}`),
      ),
      result("Mobile", uaData?.mobile),
      result("User agent", navigator.userAgent),
      result("Vendor", navigator.vendor),
      result("Platform (legacy)", navigator.platform),

      result("Language", navigator.language),
      result("Languages", navigator.languages as string[]),
      result("Timezone", intl.timeZone),
      result("Locale", intl.locale),
      result("Calendar", intl.calendar),
      result("Numbering system", intl.numberingSystem),

      result("Cookies enabled", navigator.cookieEnabled),
      result("Do Not Track", navigator.doNotTrack),
      result("PDF viewer enabled", navigator.pdfViewerEnabled),
      result("Webdriver", navigator.webdriver),
      result("Online", navigator.onLine),
    ],
  };
}
