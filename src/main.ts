import "./style.css";
import { guard } from "./types";
import { collectEnvironment } from "./collectors/environment";
import { collectCpu } from "./collectors/cpu";
import { collectMemory } from "./collectors/memory";
import { collectDisplay } from "./collectors/display";
import { render } from "./ui/render";

const COLLECTORS = [
  ["Environment", collectEnvironment],
  ["CPU", collectCpu],
  ["Memory", collectMemory],
  ["Display", collectDisplay],
] as const;

const sections = await Promise.all(COLLECTORS.map(([title, fn]) => guard(title, fn)));

render(document.querySelector<HTMLElement>("#sections")!, sections);
