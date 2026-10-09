import { PROMPTS, beatTime, clamp01, lerp, prog, ease } from './timeline.js';
import { FOCUS } from './ui/layout.js';

const deg = Math.PI / 180;
// Startup view fitted to Blender 5.0's default viewport (azimuth −25°, elevation 35°, distance 17.5).
const orbitPos = (r, h, az) => [r * Math.cos(az * deg), h, r * Math.sin(az * deg)];
export const STARTUP_CAM = { pos: orbitPos(14.34, 10.04, 25), target: [0, 0, 0], fov: 44, ortho: false, orthoHeight: 0 };

// Set once at boot from the generated city (number of tower lots).
export const CITY = { towers: 0 };

const HERO_CAM = { pos: [17, 11, 19], target: [0, 0.8, 0], fov: 38, ortho: false, orthoHeight: 0 };
export const LOOKS = {
  solid: { mode: 'solid', cube: 0, cubeSelected: false, ground: 1, rise: 1.25, windows: 0, dof: 0, overlays: 1, camera: HERO_CAM },
  night: { mode: 'rendered', cube: 0, cubeSelected: false, ground: 1, rise: 1.25, windows: 1.3, dof: 0, overlays: 0, camera: HERO_CAM },
  street: { mode: 'rendered', cube: 0, cubeSelected: false, ground: 1, rise: 1.25, windows: 1.3, dof: 1, overlays: 0,
            camera: { pos: [6.2, 0.55, 9.0], target: [0.5, 1.1, 0], fov: 50, ortho: false, orthoHeight: 0 } },
  top: { mode: 'rendered', cube: 0, cubeSelected: false, ground: 1, rise: 1.25, windows: 1.3, dof: 0, overlays: 0,
         camera: { pos: [0, 0, 0], target: [0, 0, 0], fov: 0, ortho: true, orthoHeight: 38 } },
};
const lookParam = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('look') : null;

// --- motion camera over the UI: keyframes of named focus targets ---
const KEYS = [
  [0.0, 'overview'], [0.55, 'chat'], [1.72, 'chat'], [2.0, 'viewport'], [3.45, 'viewport'], [3.75, 'outliner'],
  [4.72, 'outliner'], [5.0, 'chat'], [5.72, 'chat'], [6.0, 'viewport'], [7.72, 'viewport'], [8.0, 'chat'],
  [8.5, 'chat'], [8.78, 'full'], [10.72, 'full'], [11.0, 'chat'], [11.22, 'chat'], [11.5, 'full'], [15.0, 'full'],
];
const DRIFT = 0.018;   // slow push per second while holding a target

function focusAt(t) {
  let i = KEYS.findIndex(([kt], j) => j < KEYS.length - 1 && t >= kt && t < KEYS[j + 1][0]);
  if (i < 0) i = KEYS.length - 2;
  const [t0, a] = KEYS[i], [t1, b] = KEYS[i + 1];
  const A = FOCUS[a], B = FOCUS[b];
  if (a === b) return { cx: A.cx, cy: A.cy, s: A.s * (1 + DRIFT * (t - t0)), rotY: 0 };
  const whip = t1 - t0 <= 0.35;
  const k = (whip ? ease.inOutExpo : ease.inOutCubic)(prog(t, t0, t1));
  const held = KEYS[i - 1]?.[1] === a ? 1 + DRIFT * (t0 - KEYS[i - 1][0]) : 1;
  return {
    cx: lerp(A.cx, B.cx, k), cy: lerp(A.cy, B.cy, k),
    s: Math.exp(lerp(Math.log(A.s * held), Math.log(B.s), k)),
    rotY: whip ? -Math.sign(B.cx - A.cx) * 5 * Math.sin(Math.PI * k) : 0,
  };
}

// --- chat ---
function chatAt(t) {
  const chat = [];
  let draft = { text: '', shown: 0 };
  for (const p of PROMPTS) {
    const sendT = beatTime(p.send);
    if (t >= p.typeFrom && t < sendT) {
      draft = { text: p.text, shown: Math.round(p.text.length * prog(t, p.typeFrom, p.typeTo)) };
    }
    if (t < sendT) continue;
    chat.push({ role: 'user', text: p.text });
    const toolT = beatTime(p.tool) + (p.tool === p.send ? 0.18 : 0);
    if (t < toolT) continue;
    const doneT = p === PROMPTS[0] ? 5.0 : toolT + 0.35;
    chat.push({ role: 'claude', code: p.code, lines: Math.min(p.code.length, 1 + Math.floor((t - toolT) / 0.09)), done: t >= doneT });
  }
  return { chat, draft };
}

// quantised so each band starts on its beat
const beatSteps = (p, n) => (p >= 1 ? 1 : (Math.floor(p * n) + ease.outCubic((p * n) % 1)) / n);

// --- viewport camera ---
const FLY = [[15.5, 2.6, 0.0], [10, 0.95, 0.0], [5.5, 0.7, 0.0], [2.2, 0.85, 0.0], [-0.6, 2.4, 0.0]];
function catmull(pts, u) {
  const n = pts.length - 1, x = Math.min(n - 1e-6, Math.max(0, u * n)), i = Math.floor(x), f = x - i;
  const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n, i + 2)];
  return p1.map((_, k) => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * f + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * f * f
    + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * f * f * f));
}

function cameraAt(t) {
  if (t < 2.0) return STARTUP_CAM;
  if (t < 8.5) {
    // pull back as the city grows, then a slow dolly in at night
    const grow = ease.inOutCubic(prog(t, 2.0, 5.0)), night = ease.inOutCubic(prog(t, 6.0, 8.5));
    const r = lerp(lerp(14.34, 30, grow), 22, night), h = lerp(lerp(10.04, 17, grow), 9.5, night);
    const az = lerp(25, 58, prog(t, 2.0, 8.5));
    return { pos: orbitPos(r, h, az), target: [0, lerp(0, 1.4, grow), 0], fov: 44, ortho: false, orthoHeight: 0 };
  }
  if (t < 11.5) {
    const u = ease.inOutCubic(prog(t, 8.5, 11.0));
    const pos = catmull(FLY, u), ahead = catmull(FLY, Math.min(1, u + 0.12));
    return { pos, target: [ahead[0] - 0.6, ahead[1] + 0.25, ahead[2]], fov: 52, ortho: false, orthoHeight: 0 };
  }
  // Top Orthographic: snap in, slow push, slide the spark right to make room for the end card
  const push = ease.outExpo(prog(t, 11.5, 12.4)) * 0.6 + 0.4 * ease.inOutCubic(prog(t, 12.4, 15.0));
  const slide = ease.inOutCubic(prog(t, 13.6, 14.6));
  return { pos: [0, 0, 0], target: [lerp(0, -11, slide), 0, 0], fov: 0, ortho: true, orthoHeight: lerp(46, 34, push) };
}

export function stateAt(t) {
  if (lookParam && LOOKS[lookParam]) {
    return { t, view: LOOKS[lookParam], ui: { ...uiAt(14.99), endCard: 0, overlays: 'none', focus: { ...FOCUS.full, rotY: 0 } } };
  }
  const rise = 1.25 * beatSteps(prog(t, 2.5, 5.0), 5);
  return {
    t,
    view: {
      mode: t >= 6.0 ? 'rendered' : 'solid',
      cube: t < 2.0 ? 1 + 0.08 * Math.sin(Math.PI * prog(t, 1.88, 2.0)) : 1 - ease.outExpo(prog(t, 2.0, 2.12)),
      cubeSelected: t < 2.0,
      ground: t >= 2.0 ? 1 : 0,
      rise,
      windows: 1.3 * beatSteps(prog(t, 6.5, 8.0), 3),
      dof: t >= 8.6 && t < 11.0 ? 1 : 0,
      overlays: t >= 8.5 ? 0 : 1,
      camera: cameraAt(t),
    },
    ui: uiAt(t, rise),
  };
}

function uiAt(t, rise = 1.25) {
  const towers = Math.round(clamp01(rise) * CITY.towers);
  const flying = t >= 8.5 && t < 11.5;
  return {
    focus: focusAt(t),
    ...chatAt(t),
    caretOn: Math.floor(t * 2.5) % 2 === 0,
    outliner: { cube: t < 2.0, towers },
    activeName: t < 2.0 ? 'Cube' : flying ? 'Camera' : `Tower.${String(Math.max(1, towers)).padStart(3, '0')}`,
    viewLabel: t >= 11.5 ? 'Top Orthographic' : flying ? 'Camera Perspective' : 'User Perspective',
    shading: t >= 6.0 ? 'rendered' : 'solid',
    overlays: flying ? 'none' : t >= 11.5 ? 'label' : 'all',
    passepartout: 0,
    endCard: prog(t, 14.0, 14.7),
  };
}
