# Browser Fingerprint Lab

**[fingerprint.gwanho.com](https://fingerprint.gwanho.com)**

> You granted this page ZERO permissions. Yet your browser revealed:

An educational demo of what a web page learns about your device **without ever
showing a permission prompt**. No dialog to accept, no button to click — the
page just reads what the browser hands out for free, folds about 130 of those
signals into one composite fingerprint, and invites you to test whether it can
recognise you again after a reload, a restart, incognito, or another browser.
Every section header counts how many of its signals this browser exposes.

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
| Fingerprint | One SHA-256 per category (Hardware, Rendering, Audio, Environment) over the stable signals below, and a composite over those four. Benchmarks, viewport, heap and other per-load noise are left out |
| Environment | UA Client Hints (OS, version, architecture, model), locale, timezone, `webdriver` |
| CPU | `hardwareConcurrency`, a seven-workload benchmark (integer, float, sort, hash, JSON, matrix, hand-assembled wasm), Web Worker scaling → effective parallelism, and the CPU facts no page can read |
| Memory | `deviceMemory` (bucketed, not your installed RAM), Chromium's quantised JS heap figures, and the RAM facts no page can read |
| Storage | `navigator.storage.estimate()` usage and quota (a slice of free disk), and the disk facts no page can read |
| Display | Screen and viewport geometry, DPR, refresh rate estimated from animation-frame timing, plus media queries: colour gamut, dynamic range, and user preferences (colour scheme, contrast, reduced motion, forced colours) |
| Input | `maxTouchPoints`, pointer/hover capability classes, and a guess at the kind of machine they add up to |
| WebGL | Vendor and renderer, the unmasked GPU string via `WEBGL_debug_renderer_info`, driver limits, shader precision, extension list |
| WebGPU | Adapter vendor and architecture, supported features, key limits |
| Rendering | SHA-256 of a Canvas 2D drawing (Latin and Hangul text, emoji, gradient, shadow, blend mode, curve) and of a WebGL shader render, each drawn twice so per-load noise (Firefox `resistFingerprinting`, Safari) shows up as `unstable` |
| Audio | `AudioContext` sample rate, base/output latency and state (read, never started), plus SHA-256 of a 10 kHz tone rendered through a compressor in `OfflineAudioContext` — no microphone, no sound |
| Media | `MediaCapabilities.decodingInfo()` for H.264 / H.265 / VP9 / AV1 at 4K60 and AAC / Opus: supported, smooth, power-efficient (a hardware-decoder hint) |
| Network | `navigator.connection` (Chromium, rounded and noised), DNS / TCP / TLS / TTFB / download timings of this page's own load, and a throughput guess from its biggest resource — nothing extra is fetched |
| Browser APIs | Presence of 46 APIs by name (`"gpu" in navigator` and the like, never called), including the permission-gated ones this demo refuses to use |

The unmasked WebGL renderer usually names the exact GPU — often the exact
machine model. It costs a page nothing to read.

## Stability Lab

**Export JSON** saves everything on the page to a file. **Import JSON to compare**
reads such a file back and diffs it against the current run, signal by signal:
`SAME`, `CHANGED` (with before → after), `NEW`, `GONE`, plus the share of
signals that stayed identical. Reload, switch to incognito, plug in a monitor,
or open the file in another browser to see which signals actually move — and
whether the composite fingerprint survived. Nothing is stored between visits; the
file is the only memory.

## Development

```sh
npm install
npm run dev     # dev server
npm test        # self-checks for result/guard, sha256, the diff, and the benchmark workloads
npm run build   # tsc --noEmit && vite build
```

Every collector runs behind `guard()`, so one throwing API degrades to a single
`UNAVAILABLE` row instead of blanking the page. Add new collectors the same way,
and use `unavailable()` for values no browser exposes by design, so the row says why.

## License

[MIT](LICENSE)
