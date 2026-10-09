// Synthesised score + SFX → out/score.wav and beats.json. Run directly; importing only exposes the schedule.
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { mulberry32 } from '../src/rng.js';
import { BPM, BEATS, DURATION, CUES, PROMPTS, beatTime } from '../src/timeline.js';

const SR = 48000;
const N = Math.ceil(DURATION * SR);
const midi = m => 440 * 2 ** ((m - 69) / 12);
const TAU = Math.PI * 2;

// Bed kicks: in from the cube delete, half-time at night, driving in the fly-through, out for the reveal.
export function bedKickBeats() {
  const beats = [];
  for (let b = 4; b <= 11; b++) beats.push(b);
  for (let b = 12; b <= 16; b += 2) beats.push(b);
  for (let b = 17; b <= 22; b++) beats.push(b);
  beats.push(28);
  return beats;
}

export function scheduledHits() {
  return [
    ...CUES.map(c => ({ time: beatTime(c.beat), kind: c.kind })),
    ...bedKickBeats().map(b => ({ time: beatTime(b), kind: 'kick' })),
  ];
}

export function renderScore() {
  const L = new Float32Array(N), R = new Float32Array(N), sendL = new Float32Array(N), sendR = new Float32Array(N);
  const rand = mulberry32(42);
  const noise = () => rand() * 2 - 1;

  function add(t0, dur, fn, { gain = 1, pan = 0, rev = 0 } = {}) {
    const s0 = Math.round(t0 * SR), n = Math.round(dur * SR);
    const gl = gain * Math.cos((pan + 1) * Math.PI / 4), gr = gain * Math.sin((pan + 1) * Math.PI / 4);
    for (let i = 0; i < n; i++) {
      const j = s0 + i;
      if (j < 0 || j >= N) continue;
      const v = fn(i / SR);
      L[j] += v * gl; R[j] += v * gr; sendL[j] += v * gl * rev; sendR[j] += v * gr * rev;
    }
  }

  // --- instruments (each call returns a fresh per-voice sample function)
  const kick = () => { let ph = 0; return t => { ph += TAU * (44 + 80 * Math.exp(-t * 26)) / SR;
    return Math.sin(ph) * Math.exp(-t * 6.5) + (t < 0.003 ? noise() * 0.4 : 0); }; };
  const hat = () => { let p = 0; return t => { const n = noise(), hp = n - p; p = n; return hp * Math.exp(-t * 85); }; };
  const click = () => { let p = 0; return t => { const n = noise(), hp = n - p; p = n; return hp * Math.exp(-t * 700); }; };
  const pop = () => t => Math.sin(TAU * (980 - 2600 * t) * t) * Math.exp(-t * 55);
  const thump = () => { let ph = 0; return t => { ph += TAU * (70 - 25 * t) / SR; return Math.sin(ph) * Math.exp(-t * 9) + noise() * 0.25 * Math.exp(-t * 40); }; };
  const pluck = f => {
    const len = Math.max(2, Math.round(SR / f)), buf = Float32Array.from({ length: len }, () => noise());
    let i = 0;
    return () => { const v = buf[i], nx = buf[(i + 1) % len]; buf[i] = 0.997 * 0.5 * (v + nx); i = (i + 1) % len; return v; };
  };
  const pad = (notes, dur, atk = 0.6, rel = 0.8, cutoff = 1400) => {
    const fs = notes.flatMap(m => [0.9985, 1, 1.0015].map(d => midi(m) * d));
    const ph = fs.map(() => rand());
    const a = 1 - Math.exp(-TAU * cutoff / SR);
    let y = 0;
    return t => {
      let x = 0;
      for (let k = 0; k < fs.length; k++) { ph[k] = (ph[k] + fs[k] / SR) % 1; x += 2 * ph[k] - 1; }
      y += a * (x / fs.length - y);
      return y * Math.min(1, t / atk) * Math.min(1, Math.max(0, (dur - t) / rel));
    };
  };
  const sub = (f, dur) => t => Math.sin(TAU * f * t) * Math.min(1, t / 0.02) * Math.min(1, (dur - t) / 0.1);
  const sweep = (dur, f0, f1, rise = true) => {
    let y1 = 0, y2 = 0;
    return t => {
      const k = t / dur, fc = f0 * (f1 / f0) ** k, a = 1 - Math.exp(-TAU * fc / SR);
      const n = noise(); y1 += a * (n - y1); y2 += a * (y1 - y2);
      return (y1 - y2) * 3 * (rise ? k * k : (1 - k)) * Math.min(1, (dur - t) / 0.05);
    };
  };
  const drop = () => { let ph = 0; return t => { ph += TAU * (160 * Math.exp(-t * 3.2) + 38) / SR; return Math.sin(ph) * Math.exp(-t * 2.4); }; };

  // --- harmony (A minor, one chord per bar of 2 s)
  const CH = { Am: [57, 60, 64, 69], F: [53, 57, 60, 65], C: [55, 60, 64, 67], G: [55, 59, 62, 67], Cadd9: [48, 55, 62, 64, 67] };
  add(0.0, 4.1, pad(CH.Am, 4.1, 1.2, 0.4, 1000), { gain: 0.22, rev: 0.4 });
  add(4.0, 2.1, pad(CH.F, 2.1, 0.2, 0.3, 1200), { gain: 0.22, rev: 0.4 });
  add(6.0, 2.6, pad(CH.F.map(m => m - 12), 2.6, 0.05, 0.5, 700), { gain: 0.26, rev: 0.5 });
  add(8.5, 2.6, pad(CH.Am, 2.6, 0.1, 0.3, 2200), { gain: 0.2, rev: 0.3 });
  add(11.5, 2.6, pad(CH.F, 2.6, 0.3, 0.6, 900), { gain: 0.2, rev: 0.6 });
  add(14.0, 1.0, pad(CH.Cadd9, 1.0, 0.02, 0.9, 1800), { gain: 0.32, rev: 0.7 });
  add(14.0, 1.0, sub(midi(36), 1.0), { gain: 0.35 });

  // --- bed
  for (const b of bedKickBeats()) add(beatTime(b), 0.5, kick(), { gain: b === 28 ? 0.9 : 0.75 });
  for (let b = 4; b <= 22; b++) {
    if (b >= 12 && b <= 16) continue;
    add(beatTime(b) + 0.25, 0.08, hat(), { gain: 0.12, pan: 0.3 });
  }
  for (let b = 17; b <= 22; b++) add(beatTime(b), 0.5, sub(midi(33), 0.5), { gain: 0.3 });

  // --- cues
  const riseNotes = [57, 60, 64, 67, 69], winNotes = [81, 84, 88];
  for (const c of CUES) {
    const t = beatTime(c.beat);
    switch (c.kind) {
      case 'open': add(t, 0.5, kick(), { gain: 0.5 }); break;
      case 'send': add(t, 0.06, pop(), { gain: 0.35, rev: 0.2 }); break;
      case 'tool': add(t, 0.08, hat(), { gain: 0.25 }); add(t, 0.02, click(), { gain: 0.4 }); break;
      case 'delete': add(t, 0.4, thump(), { gain: 0.8 }); break;
      case 'rise': add(t, 1.4, pluck(midi(riseNotes[c.step])), { gain: 0.32, pan: (c.step - 2) * 0.25, rev: 0.35 }); break;
      case 'night': add(t, 1.2, drop(), { gain: 0.8, rev: 0.3 }); add(t - 0.5, 0.5, sweep(0.5, 400, 7000), { gain: 0.25 }); break;
      case 'windows': add(t, 1.2, pluck(midi(winNotes[c.step])), { gain: 0.22, pan: (c.step - 1) * 0.5, rev: 0.6 }); break;
      case 'fly': add(t - 0.5, 0.5, sweep(0.5, 300, 9000), { gain: 0.3 }); add(t, 2.4, sweep(2.4, 2500, 500, false), { gain: 0.12, rev: 0.2 }); break;
      case 'top': add(t, 0.6, kick(), { gain: 1.0, rev: 0.8 }); add(t, 0.5, sweep(0.5, 6000, 300, false), { gain: 0.35, rev: 0.8 }); break;
      case 'resolve': add(t, 0.8, pluck(midi(76)), { gain: 0.25, rev: 0.7 }); break;
    }
  }

  // --- typing clicks (texture, not hits)
  for (const p of PROMPTS) {
    for (let k = 1; k <= p.text.length; k++) {
      const t = p.typeFrom + (p.typeTo - p.typeFrom) * (k / p.text.length);
      add(t, 0.012, click(), { gain: 0.1 + 0.05 * rand(), pan: (rand() - 0.5) * 0.4 });
    }
  }

  // --- reverb (Schroeder: 4 combs + 2 allpasses per side)
  const reverb = (inp, spread) => {
    const out = new Float32Array(N);
    for (const d of [1557, 1617, 1491, 1422]) {
      const len = d + spread, buf = new Float32Array(len); let i = 0, lp = 0;
      for (let j = 0; j < N; j++) { const y = buf[i]; lp = y * 0.7 + lp * 0.3; buf[i] = inp[j] + lp * 0.84; i = (i + 1) % len; out[j] += y * 0.25; }
    }
    for (const d of [225, 556]) {
      const len = d + spread, buf = new Float32Array(len); let i = 0;
      for (let j = 0; j < N; j++) { const b = buf[i], x = out[j]; out[j] = -x + b; buf[i] = x + b * 0.5; i = (i + 1) % len; }
    }
    return out;
  };
  const wl = reverb(sendL, 0), wr = reverb(sendR, 23);
  for (let j = 0; j < N; j++) {
    const fadeOut = Math.min(1, (N - j) / (0.25 * SR));
    L[j] = Math.tanh((L[j] + wl[j] * 0.6) * 0.9) * fadeOut;
    R[j] = Math.tanh((R[j] + wr[j] * 0.6) * 0.9) * fadeOut;
  }
  return { L, R };
}

function wavFloat32({ L, R }) {
  const n = L.length, data = Buffer.alloc(n * 8), h = Buffer.alloc(44);
  for (let i = 0; i < n; i++) { data.writeFloatLE(L[i], i * 8); data.writeFloatLE(R[i], i * 8 + 4); }
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(3, 20); h.writeUInt16LE(2, 22); h.writeUInt32LE(SR, 24);
  h.writeUInt32LE(SR * 8, 28); h.writeUInt16LE(8, 32); h.writeUInt16LE(32, 34); h.write('data', 36); h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

export async function writeScore() {
  const root = new URL('..', import.meta.url);
  await mkdir(new URL('out/', root), { recursive: true });
  await writeFile(new URL('beats.json', root), JSON.stringify({ bpm: BPM, beats: Array.from({ length: BEATS }, (_, b) => beatTime(b)) }, null, 1));
  await writeFile(new URL('out/score.wav', root), wavFloat32(renderScore()));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await writeScore();
  console.log('out/score.wav, beats.json');
}
