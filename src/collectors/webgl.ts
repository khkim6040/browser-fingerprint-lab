import { result, type Section } from "../types";

/** Prefers WebGL 2 and falls back to WebGL 1. Null when no context is available. */
function createContext() {
  const canvas = document.createElement("canvas");
  const gl2 = canvas.getContext("webgl2");
  if (gl2) return { gl: gl2 as WebGLRenderingContext, api: "WebGL 2" };
  const gl1 = canvas.getContext("webgl");
  if (gl1) return { gl: gl1, api: "WebGL 1" };
  return null;
}

function precision(gl: WebGLRenderingContext, shader: number, type: number) {
  const p = gl.getShaderPrecisionFormat(shader, type);
  return p && `precision ${p.precision}, range -2^${p.rangeMin} .. 2^${p.rangeMax}`;
}

function dims(value: Int32Array | null) {
  return value && Array.from(value).join(" x ");
}

export function collectWebgl(): Section {
  const ctx = createContext();
  if (!ctx) {
    // Hardware acceleration off, GPU blocklisted, or a hardened browser profile.
    return {
      title: "WebGL",
      results: [result("WebGL context", undefined)],
    };
  }
  const { gl, api } = ctx;

  // Removed by some browsers as an anti-fingerprinting measure; absence is a result.
  const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
  const extensions = gl.getSupportedExtensions();

  const section: Section = {
    title: "WebGL",
    // Firefox answers the unmasked query with a generalised model
    // ("Apple M1, or similar"), so an unmasked value is not always exact.
    note: "Unmasked vendor and renderer come from a debug extension a browser may remove, or answer with a generalised model name rather than the real one.",
    results: [
      result("API version", api),

      // Chromium masks these behind generic strings unless debug info is available.
      result("Vendor", gl.getParameter(gl.VENDOR), "COARSE"),
      result("Renderer", gl.getParameter(gl.RENDERER), "COARSE"),
      result(
        "Unmasked vendor",
        debugInfo && gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
      ),
      result(
        "Unmasked renderer",
        debugInfo && gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL),
      ),
      result("GL version", gl.getParameter(gl.VERSION)),
      result("Shading language", gl.getParameter(gl.SHADING_LANGUAGE_VERSION)),

      result("Max texture size", gl.getParameter(gl.MAX_TEXTURE_SIZE)),
      result("Max cube map size", gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE)),
      result("Max viewport dims", dims(gl.getParameter(gl.MAX_VIEWPORT_DIMS))),
      result("Max renderbuffer size", gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)),
      result("Max vertex attribs", gl.getParameter(gl.MAX_VERTEX_ATTRIBS)),
      result("Max texture units", gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS)),
      result(
        "Max combined units",
        gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS),
      ),
      result("Max varying vectors", gl.getParameter(gl.MAX_VARYING_VECTORS)),
      result(
        "Max vertex uniforms",
        gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS),
      ),
      result(
        "Max fragment uniforms",
        gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
      ),
      result("Antialiasing", gl.getContextAttributes()?.antialias),

      result(
        "Vertex high float",
        precision(gl, gl.VERTEX_SHADER, gl.HIGH_FLOAT),
      ),
      result(
        "Fragment high float",
        precision(gl, gl.FRAGMENT_SHADER, gl.HIGH_FLOAT),
      ),

      result("Extension count", extensions?.length),
      result("Extensions", extensions),
    ],
  };

  // Release the GPU context instead of waiting for the canvas to be collected.
  gl.getExtension("WEBGL_lose_context")?.loseContext();
  return section;
}
