import { sha256 } from "../fingerprint/hash";
import { result, type Section } from "../types";

/**
 * Text, blend modes and a curve — the parts of 2D rasterisation where font
 * hinting, subpixel rounding and the compositor differ between devices.
 */
function drawCanvas2d(): string | undefined {
  const canvas = document.createElement("canvas");
  canvas.width = 300;
  canvas.height = 80;
  const ctx = canvas.getContext("2d");
  if (!ctx) return undefined;

  ctx.textBaseline = "top";
  ctx.font = "14px 'Arial'";
  ctx.fillStyle = "#f60";
  ctx.fillRect(0, 0, 120, 40);
  ctx.fillStyle = "#069";
  ctx.fillText("Fingerprint lab \u{1F50E} gq", 2, 15);
  ctx.fillStyle = "rgba(102, 200, 0, 0.7)";
  ctx.fillText("Fingerprint lab \u{1F50E} gq", 4, 25);
  ctx.globalCompositeOperation = "multiply";
  ctx.beginPath();
  ctx.arc(60, 40, 30, 0, Math.PI * 2);
  ctx.fill();

  return canvas.toDataURL();
}

const VERTEX = `attribute vec2 p; varying vec2 v;
void main() { v = p; gl_Position = vec4(p, 0.0, 1.0); }`;

// Transcendentals are where drivers disagree: the same GLSL lands on different
// last bits per GPU and compiler, so the pixels differ even at identical size.
const FRAGMENT = `precision highp float; varying vec2 v;
void main() {
  float n = fract(sin(dot(v, vec2(12.9898, 78.233))) * 43758.5453);
  gl_FragColor = vec4(sin(v.x * 12.9898) * 0.5 + 0.5, cos(v.y * 78.233) * 0.5 + 0.5, n, 1.0);
}`;

function drawWebgl(): Uint8Array<ArrayBuffer> | undefined {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
  if (!gl) return undefined;

  const program = gl.createProgram();
  for (const [type, source] of [
    [gl.VERTEX_SHADER, VERTEX],
    [gl.FRAGMENT_SHADER, FRAGMENT],
  ] as const) {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    gl.attachShader(program, shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return undefined;
  gl.useProgram(program);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW,
  );
  const p = gl.getAttribLocation(program, "p");
  gl.enableVertexAttribArray(p);
  gl.vertexAttribPointer(p, 2, gl.FLOAT, false, 0, 0);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  const pixels = new Uint8Array(canvas.width * canvas.height * 4);
  gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  gl.getExtension("WEBGL_lose_context")?.loseContext();
  return pixels;
}

/**
 * Draws twice. A browser that adds per-read noise (Firefox
 * `privacy.resistFingerprinting`, Safari) gives two different hashes, which is
 * itself the result worth showing — an unstable hash identifies nobody.
 */
async function stableHash(
  draw: () => string | Uint8Array<ArrayBuffer> | undefined,
): Promise<string | undefined> {
  const first = draw();
  if (first === undefined) return undefined;
  const second = draw();
  if (second === undefined) return undefined;

  const [a, b] = await Promise.all([sha256(first), sha256(second)]);
  return a === b
    ? a.slice(0, 16)
    : `unstable — redraw gave ${a.slice(0, 16)} then ${b.slice(0, 16)}`;
}

export async function collectRendering(): Promise<Section> {
  return {
    title: "Rendering",
    note: "Hashes of what this device actually drew, not values an API reported. Each is drawn twice: browsers that inject anti-fingerprinting noise produce a different hash every time.",
    results: [
      result("Canvas 2D", await stableHash(drawCanvas2d), "INFERRED"),
      result("WebGL render", await stableHash(drawWebgl), "INFERRED"),
    ],
  };
}
