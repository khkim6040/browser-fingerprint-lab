import "./style.css";
import { guard } from "./types";
import { collectEnvironment } from "./collectors/environment";
import { collectCpu } from "./collectors/cpu";
import { collectMemory } from "./collectors/memory";
import { collectDisplay } from "./collectors/display";
import { collectInput } from "./collectors/input";
import { collectWebgl } from "./collectors/webgl";
import { collectWebgpu } from "./collectors/webgpu";
import { collectRendering } from "./collectors/rendering";
import { collectAudio } from "./collectors/audio";
import { collectMedia } from "./collectors/media";
import { render } from "./ui/render";
import { mountLab } from "./ui/lab";

const COLLECTORS = [
  ["Environment", collectEnvironment],
  ["CPU", collectCpu],
  ["Memory", collectMemory],
  ["Display", collectDisplay],
  ["Input", collectInput],
  ["WebGL", collectWebgl],
  ["WebGPU", collectWebgpu],
  ["Rendering", collectRendering],
  ["Audio", collectAudio],
  ["Media", collectMedia],
] as const;

const sections = await Promise.all(COLLECTORS.map(([title, fn]) => guard(title, fn)));

render(document.querySelector<HTMLElement>("#sections")!, sections);
mountLab(
  document.querySelector<HTMLElement>("#lab-toolbar")!,
  document.querySelector<HTMLElement>("#lab")!,
  sections,
  __APP_VERSION__,
);
