import "./style.css";
import { guard } from "./types";
import { collectEnvironment } from "./collectors/environment";
import { collectCpu } from "./collectors/cpu";
import { collectMemory } from "./collectors/memory";
import { collectStorage } from "./collectors/storage";
import { collectDisplay } from "./collectors/display";
import { collectInput } from "./collectors/input";
import { collectWebgl } from "./collectors/webgl";
import { collectWebgpu } from "./collectors/webgpu";
import { collectRendering } from "./collectors/rendering";
import { collectAudio } from "./collectors/audio";
import { collectMedia } from "./collectors/media";
import { collectNetwork } from "./collectors/network";
import { collectServer } from "./collectors/where";
import { collectFeatures } from "./collectors/features";
import { collectFingerprint } from "./collectors/fingerprint";
import { render, renderHero } from "./ui/render";
import { mountLab } from "./ui/lab";

const COLLECTORS = [
  ["Environment", collectEnvironment],
  ["CPU", collectCpu],
  ["Memory", collectMemory],
  ["Storage", collectStorage],
  ["Display", collectDisplay],
  ["Input", collectInput],
  ["WebGL", collectWebgl],
  ["WebGPU", collectWebgpu],
  ["Rendering", collectRendering],
  ["Audio", collectAudio],
  ["Media", collectMedia],
  ["Network", collectNetwork],
  ["Server", collectServer],
  ["Browser APIs", collectFeatures],
] as const;

const started = performance.now();
const collected = await Promise.all(COLLECTORS.map(([title, fn]) => guard(title, fn)));
const sections = [await guard("Fingerprint", () => collectFingerprint(collected)), ...collected];

render(document.querySelector<HTMLElement>("#sections")!, sections);
renderHero(document.querySelector<HTMLElement>("#hero")!, sections, performance.now() - started);
mountLab(
  document.querySelector<HTMLElement>("#lab-toolbar")!,
  document.querySelector<HTMLElement>("#lab")!,
  sections,
  __APP_VERSION__,
);
