import { result, type Section } from "../types";

// One demanding configuration per codec: 4K60 is where "power-efficient"
// separates a hardware decoder from software fallback on the same browser.
const VIDEO = { width: 3840, height: 2160, bitrate: 20_000_000, framerate: 60 };
const AUDIO = { channels: "2", bitrate: 128_000, samplerate: 48000 };

const CONFIGS: [string, MediaDecodingConfiguration][] = [
  ["H.264 4K60", { type: "file", video: { contentType: 'video/mp4; codecs="avc1.640034"', ...VIDEO } }],
  ["H.265 4K60", { type: "file", video: { contentType: 'video/mp4; codecs="hvc1.1.6.L153.B0"', ...VIDEO } }],
  ["VP9 4K60", { type: "file", video: { contentType: 'video/webm; codecs="vp09.00.51.08"', ...VIDEO } }],
  ["AV1 4K60", { type: "file", video: { contentType: 'video/mp4; codecs="av01.0.13M.08"', ...VIDEO } }],
  ["AAC", { type: "file", audio: { contentType: 'audio/mp4; codecs="mp4a.40.2"', ...AUDIO } }],
  ["Opus", { type: "file", audio: { contentType: 'audio/webm; codecs="opus"', ...AUDIO } }],
];

function describe(info: MediaCapabilitiesDecodingInfo): string {
  if (!info.supported) return "unsupported";
  return ["supported", info.smooth && "smooth", info.powerEfficient && "power-efficient"]
    .filter(Boolean)
    .join(", ");
}

export async function collectMedia(): Promise<Section> {
  const results = await Promise.all(
    CONFIGS.map(async ([name, config]) =>
      // Optional: absent in older browsers. A config string one browser rejects
      // (TypeError) blanks only its own row.
      result(name, await navigator.mediaCapabilities?.decodingInfo(config).then(describe, () => undefined)),
    ),
  );
  return {
    title: "Media",
    note: "What this browser claims it can decode: 4K60 video and 48 kHz stereo audio per codec, and whether playback would be smooth and power-efficient — the latter usually means a hardware decoder. No media is fetched or played.",
    results,
  };
}
