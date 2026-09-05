import { defineConfig } from "vite";
import { version } from "./package.json";

// This lab targets browsers new enough to have the APIs it probes; no point
// down-levelling to esbuild's default (chrome87).
export default defineConfig({
  build: { target: "es2022" },
  define: { __APP_VERSION__: JSON.stringify(version) },
});
