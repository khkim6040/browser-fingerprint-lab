import { stableHash } from "../fingerprint/hash";
import { result, type Section } from "../types";

/**
 * Renders a 10 kHz triangle wave through a compressor entirely offline. The
 * samples that come out depend on the browser's DSP code and the platform's
 * math library, not on any microphone or speaker — nothing is heard or recorded.
 */
async function renderOffline(): Promise<Float32Array<ArrayBuffer>> {
  const ctx = new OfflineAudioContext(1, 5000, 44100);
  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.value = 10000;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -50;
  comp.knee.value = 40;
  comp.ratio.value = 12;
  comp.attack.value = 0;
  comp.release.value = 0.25;
  osc.connect(comp).connect(ctx.destination);
  osc.start();
  return (await ctx.startRendering()).getChannelData(0);
}

const ms = (seconds: number) => `${(seconds * 1000).toFixed(2)} ms`;

export async function collectAudio(): Promise<Section> {
  // Created without a user gesture the context stays suspended (Chrome warns
  // about that in the console); it is only read for its settings, then closed.
  const ctx = new AudioContext();
  const { sampleRate, baseLatency, outputLatency, state } = ctx;
  await ctx.close();

  return {
    title: "Audio",
    note: "No microphone was opened, nothing was recorded and nothing was audible. The live context is read for its settings only and never started; the hash is of a synthetic 10 kHz tone rendered offline, twice.",
    results: [
      result("Sample rate", `${sampleRate} Hz`),
      // Both read 0 until the context actually runs, which needs a user gesture.
      result("Base latency", baseLatency ? ms(baseLatency) : undefined),
      result("Output latency", outputLatency ? ms(outputLatency) : undefined),
      result("Context state", state),
      result("OfflineAudio render", await stableHash(renderOffline), "INFERRED"),
    ],
  };
}
