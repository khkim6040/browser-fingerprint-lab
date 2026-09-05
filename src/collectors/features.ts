import { result, type Section } from "../types";

// Presence checks only (`name in window` / `name in navigator`): nothing is
// called, so the permission-gated APIs at the end never prompt.
const ON_WINDOW: Record<string, string> = {
  "WebGL 2": "WebGL2RenderingContext",
  WebAssembly: "WebAssembly",
  SharedArrayBuffer: "SharedArrayBuffer",
  "Web Workers": "Worker",
  OffscreenCanvas: "OffscreenCanvas",
  WebRTC: "RTCPeerConnection",
  "Web Audio": "AudioContext",
  WebCodecs: "VideoDecoder",
  "Speech Synthesis": "speechSynthesis",
  WebSocket: "WebSocket",
  WebTransport: "WebTransport",
  "Broadcast Channel": "BroadcastChannel",
  "Payment Request": "PaymentRequest",
  "Web Authentication": "PublicKeyCredential",
  Notifications: "Notification",
  "Push API": "PushManager",
  "Idle Detection": "IdleDetector",
  "Compute Pressure": "PressureObserver",
  "Web NFC": "NDEFReader",
  "Device Orientation": "DeviceOrientationEvent",
  "File System Access": "showOpenFilePicker",
  "Screen Details": "getScreenDetails",
  "Local Font Access": "queryLocalFonts",
};

const ON_NAVIGATOR: Record<string, string> = {
  WebGPU: "gpu",
  "Service Worker": "serviceWorker",
  MediaCapabilities: "mediaCapabilities",
  "Media Session": "mediaSession",
  "Media Devices": "mediaDevices",
  "Web Locks": "locks",
  "Storage Manager": "storage",
  Clipboard: "clipboard",
  "Web Share": "share",
  "Credential Management": "credentials",
  "Battery Status": "getBattery",
  "Network Information": "connection",
  Vibration: "vibrate",
  "Wake Lock": "wakeLock",
  "Contact Picker": "contacts",
  "Web MIDI": "requestMIDIAccess",
  Gamepad: "getGamepads",
  WebXR: "xr",
  Geolocation: "geolocation",
  "Web Bluetooth": "bluetooth",
  WebUSB: "usb",
  WebHID: "hid",
  "Web Serial": "serial",
};

export function collectFeatures(): Section {
  const checks: [string, boolean][] = [
    ...Object.entries(ON_WINDOW).map(([label, key]): [string, boolean] => [label, key in window]),
    ...Object.entries(ON_NAVIGATOR).map(([label, key]): [string, boolean] => [label, key in navigator]),
  ];
  const available = checks.filter(([, ok]) => ok).map(([label]) => label);
  const missing = checks.filter(([, ok]) => !ok).map(([label]) => label);
  return {
    title: "Browser APIs",
    note: "Which APIs exist here, by name only — none is called. The set a browser ships is a fingerprint in itself, and the missing ones show what it deliberately left out.",
    results: [
      result("Supported", `${available.length} / ${checks.length}`),
      result("Available", available),
      result("Missing", missing.length ? missing : "none"),
    ],
  };
}
