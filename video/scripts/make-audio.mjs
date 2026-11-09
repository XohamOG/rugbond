// Synthesises the whole soundtrack from code, so the video contains no third-party audio.
// Hit times must match the scene timings in src/RugBondDemo.tsx. Writes public/soundtrack.wav.
import fs from "node:fs";

const RATE = 44100;
const DURATION = 148;
const N = RATE * DURATION;
const L = new Float32Array(N);
const R = new Float32Array(N);

let seed = 7;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const midi = (m) => 440 * 2 ** ((m - 69) / 12);

function put(i, v, pan = 0) {
  if (i < 0 || i >= N) return;
  L[i] += v * (1 - Math.max(0, pan));
  R[i] += v * (1 + Math.min(0, pan));
}

function kick(t, gain = 0.9) {
  const len = 0.32 * RATE;
  for (let i = 0; i < len; i++) {
    const s = i / RATE;
    const f = 42 + 110 * Math.exp(-s * 32);
    put(Math.floor(t * RATE) + i, Math.sin(2 * Math.PI * f * s) * Math.exp(-s * 10) * gain);
  }
}

function hat(t, gain = 0.09, decay = 60) {
  const len = 0.09 * RATE;
  let prev = 0;
  for (let i = 0; i < len; i++) {
    const n = rand() * 2 - 1;
    const high = n - prev;
    prev = n;
    put(Math.floor(t * RATE) + i, high * Math.exp((-i / RATE) * decay) * gain, i % 2 ? 0.2 : -0.2);
  }
}

function clap(t, gain = 0.2) {
  const len = 0.18 * RATE;
  for (let i = 0; i < len; i++) {
    const s = i / RATE;
    put(Math.floor(t * RATE) + i, (rand() * 2 - 1) * Math.exp(-s * 24) * gain);
  }
}

function tone(t, dur, m, gain, shape = "saw", pan = 0, cutoff = 900) {
  const f = midi(m);
  const len = Math.floor(dur * RATE);
  let low = 0;
  const a = 1 - Math.exp((-2 * Math.PI * cutoff) / RATE);
  for (let i = 0; i < len; i++) {
    const s = i / RATE;
    let v;
    if (shape === "saw") v = (2 * ((f * s) % 1) - 1) * 0.5 + (2 * ((f * 1.006 * s) % 1) - 1) * 0.5;
    else v = Math.sin(2 * Math.PI * f * s);
    low += a * (v - low);
    const env = Math.min(1, s / 0.01) * Math.min(1, (dur - s) / 0.04);
    put(Math.floor(t * RATE) + i, low * env * gain, pan);
  }
}

function pad(t, dur, notes, gain) {
  for (const m of notes) {
    const f = midi(m);
    const len = Math.floor(dur * RATE);
    let low = 0;
    const a = 1 - Math.exp((-2 * Math.PI * 420) / RATE);
    const fade = Math.min(1.2, dur / 3);
    for (let i = 0; i < len; i += 1) {
      const s = i / RATE;
      const v = (2 * ((f * s) % 1) - 1) * 0.5 + (2 * ((f * 1.004 * s) % 1) - 1) * 0.5;
      low += a * (v - low);
      const env = Math.min(1, s / fade) * Math.min(1, (dur - s) / fade);
      put(Math.floor(t * RATE) + i, low * env * gain, Math.sin(s * 0.8) * 0.3);
    }
  }
}

/** The heavy rubber-stamp impact used on every seal. */
function stamp(t, gain = 1) {
  const len = 0.7 * RATE;
  for (let i = 0; i < len; i++) {
    const s = i / RATE;
    const f = 34 + 150 * Math.exp(-s * 40);
    const body = Math.sin(2 * Math.PI * f * s) * Math.exp(-s * 7);
    const snap = (rand() * 2 - 1) * Math.exp(-s * 70) * 0.8;
    put(Math.floor(t * RATE) + i, (body + snap) * gain);
  }
}

function riser(t, dur, gain = 0.25) {
  const len = Math.floor(dur * RATE);
  let low = 0;
  for (let i = 0; i < len; i++) {
    const p = i / len;
    const a = 0.01 + p * p * 0.5;
    low += a * (rand() * 2 - 1 - low);
    put(Math.floor(t * RATE) + i, low * p * p * gain, Math.sin(p * 30) * 0.4);
  }
}

function tick(t, gain = 0.5) {
  tone(t, 0.05, 88, gain * 0.3, "sine");
  hat(t, gain * 0.5, 120);
}

const BEAT = 0.5;
const CHORDS = [
  [57, 60, 64],
  [53, 57, 60],
  [50, 53, 57],
  [52, 56, 59],
];
const ROOTS = [33, 29, 26, 28];

function groove(start, end, { drums = true, bass = true, arp = true, level = 1 } = {}) {
  const bars = Math.floor((end - start) / (BEAT * 4));
  for (let b = 0; b < bars; b++) {
    const t = start + b * BEAT * 4;
    const c = Math.floor(b / 2) % 4;
    pad(t, BEAT * 4 + 0.1, CHORDS[c].map((m) => m + 12), 0.035 * level);
    for (let s = 0; s < 16; s++) {
      const st = t + (s * BEAT) / 4;
      if (drums && s % 4 === 0) kick(st, 0.75 * level);
      if (drums && s % 4 === 2) hat(st, 0.1 * level);
      if (drums && s % 2 === 1) hat(st, 0.04 * level);
      if (drums && (s === 4 || s === 12)) clap(st, 0.13 * level);
      if (bass && s % 2 === 0 && s !== 4) tone(st, BEAT / 2.2, ROOTS[c] + 12, 0.17 * level, "saw", 0, 300);
      if (arp && s % 2 === 0) {
        const note = CHORDS[c][(s / 2) % 3] + 24;
        tone(st, 0.13, note, 0.038 * level, "saw", (s / 8 - 1) * 0.5, 2200);
      }
    }
  }
}

// Cold open: ticks over a low drone, then silence before "Talk is free."
pad(0, 8, [33, 45], 0.05);
for (const [i, t] of [0.3, 1.2, 1.9, 2.5, 3.05, 3.55, 4.0, 4.4, 4.75, 5.05, 5.3, 5.55, 5.75, 5.95, 6.1, 6.25, 6.4].entries()) tick(t, 0.5 + i * 0.02);
riser(5.8, 2.2, 0.32);
stamp(8, 0.85);

// The problem: pad and a heartbeat kick.
pad(9.5, 12.5, [45, 52, 57], 0.045);
for (let t = 12; t < 22; t += 1) {
  kick(t, 0.5);
  kick(t + 0.22, 0.3);
}
stamp(16, 0.6);
riser(20, 2, 0.28);

// Title stamp, then the main groove through the explainer and product.
stamp(23, 1);
pad(23, 7, [45, 57, 60, 64], 0.05);
groove(30, 72, { level: 0.85 });
for (const t of [30, 36, 42]) hat(t, 0.25, 12);
stamp(65.2, 0.9);
riser(70, 2, 0.36);

// The rug: everything drops out, then tension, then the impact.
stamp(72, 1);
pad(72, 13, [33, 40, 46], 0.06);
for (let t = 76; t < 85; t += 1) kick(t, 0.65);
for (let t = 80; t < 85; t += 0.25) hat(t, 0.1 + (t - 80) * 0.03);
riser(82.5, 2.5, 0.42);
stamp(85, 1.3);
kick(85, 1);

// Burn and proof.
groove(86, 118, { level: 0.95 });
riser(98, 2, 0.3);

// Honest limits: sparse, then the flywheel lifts it again.
pad(118, 10, [45, 52, 60], 0.05);
for (let t = 118; t < 128; t += 2) kick(t, 0.4);
for (const t of [120.5, 122.5, 124.5]) stamp(t, 0.35);
groove(128, 140, { level: 0.8 });

// End card.
stamp(141, 1);
pad(141, 7, [45, 57, 64], 0.05);

// Soft-clip, fade the tail, write 16-bit stereo PCM.
const data = Buffer.alloc(N * 4);
const clip = (x) => Math.tanh(x * 1.1) * 0.92;
for (let i = 0; i < N; i++) {
  const fade = Math.min(1, (N - i) / (RATE * 1.5));
  data.writeInt16LE(Math.round(clip(L[i] * fade) * 32767), i * 4);
  data.writeInt16LE(Math.round(clip(R[i] * fade) * 32767), i * 4 + 2);
}
const header = Buffer.alloc(44);
header.write("RIFF", 0);
header.writeUInt32LE(36 + data.length, 4);
header.write("WAVEfmt ", 8);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(2, 22);
header.writeUInt32LE(RATE, 24);
header.writeUInt32LE(RATE * 4, 28);
header.writeUInt16LE(4, 32);
header.writeUInt16LE(16, 34);
header.write("data", 36);
header.writeUInt32LE(data.length, 40);
fs.writeFileSync(new URL("../public/soundtrack.wav", import.meta.url), Buffer.concat([header, data]));
console.log("soundtrack written:", (data.length / 1e6).toFixed(1), "MB");
