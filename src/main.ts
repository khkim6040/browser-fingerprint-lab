import "./style.css";
import { guard } from "./types";
import { collectEnvironment } from "./collectors/environment";
import { collectCpu } from "./collectors/cpu";
import { collectMemory } from "./collectors/memory";
import { collectDisplay } from "./collectors/display";
import { collectWebgl } from "./collectors/webgl";
import { collectWebgpu } from "./collectors/webgpu";
import { collectRendering } from "./collectors/rendering";
import { render } from "./ui/render";

const COLLECTORS = [
  ["Environment", collectEnvironment],
  ["CPU", collectCpu],
  ["Memory", collectMemory],
  ["Display", collectDisplay],
  ["WebGL", collectWebgl],
  ["WebGPU", collectWebgpu],
  ["Rendering", collectRendering],
] as const;

const sections = await Promise.all(COLLECTORS.map(([title, fn]) => guard(title, fn)));

render(document.querySelector<HTMLElement>("#sections")!, sections);
