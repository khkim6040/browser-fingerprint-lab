# Browser Fingerprint Lab

**[fingerprint.gwanho.com](https://fingerprint.gwanho.com)**

> You granted this page ZERO permissions. Yet your browser revealed:

An educational demo of what a web page learns about your device **without ever
showing a permission prompt**. No dialog to accept, no button to click — the
page just reads what the browser hands out for free.

## Principles

- **Frontend only.** Nothing is sent anywhere. There is no server, no analytics,
  no cookie, no persistent storage. Reload and the page starts from nothing.
- **No permission-gated API, ever.** Geolocation, camera, microphone, Bluetooth,
  USB, HID, Serial, `getScreenDetails()` and Local Font Access are all excluded
  on purpose. The moment a dialog appears, the point is lost.
- **Every value is classified**, and "nothing" is a result too:

  | Badge | Meaning |
  | --- | --- |
  | `DIRECT` | The browser reports the real value as-is. |
  | `COARSE` | Deliberately bucketed or rounded to blunt fingerprinting. |
  | `INFERRED` | Derived from measurement, not read from an API. |
  | `UNAVAILABLE` | This browser does not expose it — a defence worth seeing. |

`UNAVAILABLE` rows are half the exhibit. They show which browser hardened which
surface, which is why no user-agent string parsing is used to paper over gaps.

## What it collects today

| Section | Examples |
| --- | --- |
| Environment | UA Client Hints (OS, version, architecture, model), locale, timezone, `webdriver` |
| CPU | `hardwareConcurrency` |
| Memory | `deviceMemory` (bucketed, not your installed RAM) |
| Display | Screen and viewport geometry, DPR, plus media queries: colour gamut, dynamic range, pointer/hover class, and user preferences (colour scheme, contrast, reduced motion, forced colours) |
| WebGL | Vendor and renderer, the unmasked GPU string via `WEBGL_debug_renderer_info`, driver limits, shader precision, extension list |
| WebGPU | Adapter vendor and architecture, supported features, key limits |
| Rendering | SHA-256 of a Canvas 2D drawing and of a WebGL shader render, each drawn twice so per-load noise (Firefox `resistFingerprinting`, Safari) shows up as `unstable` |

The unmasked WebGL renderer usually names the exact GPU — often the exact
machine model. It costs a page nothing to read.

## Stability Lab

**Export JSON** saves everything on the page to a file. **Import JSON to compare**
reads such a file back and diffs it against the current run, signal by signal:
`SAME`, `CHANGED` (with before → after), `NEW`, `GONE`, plus the share of
signals that stayed identical. Reload, switch to incognito, plug in a monitor,
or open the file in another browser to see which signals actually move. Nothing
is stored between visits; the file is the only memory.

## Development

```sh
npm install
npm run dev     # dev server
npm test        # self-checks for result/guard, sha256 and the diff
npm run build   # tsc --noEmit && vite build
```

Every collector runs behind `guard()`, so one throwing API degrades to a single
`UNAVAILABLE` row instead of blanking the page. Add new collectors the same way.
