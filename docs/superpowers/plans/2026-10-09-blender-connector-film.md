# "One Connector" Film Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A 15 s, 1920×1080/60 fps film where Claude builds a city in Blender through the Blender connector, ending on a top view whose footprint is Claude's spark.

**Architecture:** One HTML page. `src/state.js` turns t into a plain state object; every visual module applies that state (three.js viewport, Blender/Claude DOM UI, motion camera) with no memory of earlier frames. `window.seek(t)` = `apply(stateAt(t))`. Node scripts drive system Chrome (puppeteer-core) to capture frames, synthesise audio from the same cue list, and encode with ffmpeg.

**Tech Stack:** three 0.186.1 (WebGLRenderer + EffectComposer addons), puppeteer-core 25.13.0 with `/Applications/Google Chrome.app`, @fontsource geist-sans / geist-mono / instrument-serif 5.3.0, Node 22 (`node:test`), ffmpeg 9.

**Spec:** `docs/superpowers/specs/2026-10-09-blender-connector-film-design.md`

## Global Constraints
- Output 1920×1080, 60 fps, 900 frames, 15.0 s; H.264 yuv420p CRF 16; AAC; -14 LUFS integrated, true peak ≤ -1 dBTP.
- `window.seek(t)` paints frame t. No CSS transitions/animations, no setTimeout, no requestAnimationFrame outside `?preview`, no state carried between frames. Never `Math.random` in project code — `mulberry32`/`hash01` only.
- 120 BPM, beat b at t = b × 0.5 s, 30 beats. Every audio hit cue sits on a beat.
- Palette: `#141414` stage, `#1D1D1D`/`#2B2B2B`/`#303030` panels, `#3D3D3D` viewport, `#F0EEE6` text, one accent `#D97757`. Blender axis red/green and gizmo colours allowed, desaturated. No blue elsewhere. All emissive light cream or orange.
- Faces: Instrument Serif (end card only); Geist Sans + Geist Mono (UI/code). Bundled from node_modules.
- Banned: centered title on gradient, everything fading in, corner labels/frame borders, glow on UI chrome, generic particle bursts, callout labels.
- Code shown on screen is valid bpy. Tool-call card label is the connector name "Blender"; no invented tool names.
- Commits: no AI co-author trailer (user rule).

## Review Focus
- `seek` with t < 0, t ≥ 15, NaN, or a string (render loop rounding, preview scrubber) → clamps into [0, 15), never throws.
- `seek` called before assets/fonts load → `window.ready` must resolve first; capture scripts await it and a rejected `ready` (e.g. WebGL context failure) aborts with the error instead of capturing black frames.
- Out-of-order seeks (contact sheet, tests) → byte-identical frames to in-order playback.
- Headless Chrome without GPU/WebGL → `openStage` fails loudly with the page error, not silently.
- Final file drift → `render.mjs` verifies 900 frames, 15.0 s duration and loudness within ±0.5 LU of -14 after encoding, and exits non-zero otherwise.

---

## File Structure
| File | Responsibility |
|---|---|
| `package.json` | Pinned deps, scripts. |
| `index.html` | Stage markup, import map. |
| `src/styles.css` | Fonts, tokens, stage + UI styles. |
| `src/main.js` | Boot, `window.ready`, `window.seek`. |
| `src/preview.js` | Scrubber/play (preview only). |
| `src/rng.js` | `mulberry32`, `hash01`. |
| `src/timeline.js` | BPM/beat constants, easing, `PROMPTS`, `CUES`. Pure, shared with Node. |
| `src/state.js` | `stateAt(t)` → state object. Pure, shared with Node. |
| `src/spark.js` | Spark SVG → lot mask (browser). |
| `src/scene/cityData.js` | Mask → buildings/props/lights/cars arrays. Pure. |
| `src/scene/city.js` | three.js meshes for cityData + `update(view)`. |
| `src/scene/defaultScene.js` | Blender grid floor, axes, default cube, camera & light gizmos. |
| `src/scene/post.js` | Composer: Render → GTAO → Outline → Bloom → Bokeh → Output (AgX). |
| `src/scene/viewport.js` | Renderer, scene, lights, modes, camera apply, render. |
| `src/ui/blender.js` | Blender window DOM + `update(ui)`. |
| `src/ui/claude.js` | Claude window DOM + `update(ui)`. |
| `src/ui/framing.js` | Motion camera, UI slide-away, end card. |
| `audio/synth.mjs` | DSP primitives. |
| `audio/score.mjs` | Builds `out/score.wav` + `beats.json` from `CUES`/`PROMPTS`. |
| `tools/serve.mjs` | Static server. |
| `tools/stage.mjs` | `openStage(query)` → `{ frame(t), close() }`. |
| `tools/still.mjs` | One PNG for a look-dev state or t. |
| `contact.mjs` | One frame per beat → `out/contact.png`. |
| `render.mjs` | Full render + mux + verification. |
| `test/determinism.test.mjs`, `test/beats.test.mjs` | Important-behaviour tests. |

---

### Task 1: Scaffold, seek contract, determinism test

**Files:**
- Create: `package.json`, `index.html`, `src/styles.css`, `src/main.js`, `src/preview.js`, `src/rng.js`, `src/timeline.js`, `src/state.js`, `src/scene/viewport.js`, `src/scene/defaultScene.js`, `tools/serve.mjs`, `tools/stage.mjs`
- Test: `test/determinism.test.mjs`

**Interfaces:**
- Produces: `window.ready: Promise<void>`, `window.seek(t: number): void`; `openStage(query?: string) → Promise<{ frame(t): Promise<Buffer /*PNG*/>, page, close(): Promise<void> }>`; `stateAt(t) → { t, view: { mode, cube, cubeSelected, rise, windows, dof, overlays, camera: { pos:[x,y,z], target:[x,y,z], fov, ortho:boolean, orthoHeight } } }`; `mulberry32(seed) → () => number`, `hash01(...ints) → number`; timeline exports `BPM, BEAT, DURATION, FPS, BEATS, beatTime, clamp01, lerp, prog, ease`.

- [ ] **Step 1: package.json + install**

```json
{
  "name": "one-connector",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test test/",
    "preview": "node tools/serve.mjs",
    "still": "node tools/still.mjs",
    "score": "node audio/score.mjs",
    "contact": "node contact.mjs",
    "render": "node render.mjs"
  },
  "dependencies": {
    "@fontsource/geist-mono": "5.3.0",
    "@fontsource/geist-sans": "5.3.0",
    "@fontsource/instrument-serif": "5.3.0",
    "puppeteer-core": "25.13.0",
    "three": "0.186.1"
  }
}
```
Run: `npm install`. Expected: no errors.

- [ ] **Step 2: Write the failing determinism test**

```js
// test/determinism.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { openStage } from '../tools/stage.mjs';

const sha = b => createHash('sha256').update(b).digest('hex');

test('seek(t) is a pure function of t', { timeout: 180_000 }, async () => {
  const stage = await openStage();
  try {
    const times = [0, 1.25, 3.2, 6.6, 9.6, 12.4, 14.9];
    const first = new Map();
    for (const t of times) first.set(t, sha(await stage.frame(t)));
    for (const t of [...times].reverse()) {
      assert.equal(sha(await stage.frame(t)), first.get(t), `frame at t=${t} differs on revisit`);
    }
  } finally { await stage.close(); }
});

test('seek clamps bad input instead of throwing', { timeout: 120_000 }, async () => {
  const stage = await openStage();
  try {
    const zero = sha(await stage.frame(0));
    assert.equal(sha(await stage.frame(-3)), zero);
    assert.equal(sha(await stage.frame(Number.NaN)), zero);
    assert.equal(sha(await stage.frame('0')), zero);
    const end = sha(await stage.frame(15));
    assert.equal(sha(await stage.frame(99)), end);
  } finally { await stage.close(); }
});
```

- [ ] **Step 3: Run it to see it fail**

Run: `node --test test/determinism.test.mjs`
Expected: FAIL — `Cannot find module '../tools/stage.mjs'`.

- [ ] **Step 4: Server + stage harness**

```js
// tools/serve.mjs
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.wav': 'audio/wav',
};

export function startServer(port = 0) {
  const server = http.createServer(async (req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (path.includes('..')) { res.writeHead(400).end(); return; }
    try {
      const body = await readFile(join(ROOT, path === '/' ? 'index.html' : path));
      res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' }).end(body);
    } catch { res.writeHead(404).end(); }
  });
  return new Promise(resolve => server.listen(port, '127.0.0.1', () => resolve({
    url: `http://127.0.0.1:${server.address().port}`,
    close: () => server.close(),
  })));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { url } = await startServer(5173);
  console.log(`${url}/index.html?preview`);
}
```

```js
// tools/stage.mjs
import puppeteer from 'puppeteer-core';
import { startServer } from './serve.mjs';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export const W = 1920, H = 1080;

export async function openStage(query = '') {
  const server = await startServer();
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--force-device-scale-factor=1',
           '--hide-scrollbars', '--mute-audio', '--font-render-hinting=none'],
    defaultViewport: { width: W, height: H, deviceScaleFactor: 1 },
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e));
  page.on('console', m => { if (m.type() === 'error') errors.push(new Error(m.text())); });
  const fail = async e => { await browser.close(); server.close(); throw e; };
  await page.goto(`${server.url}/index.html?render${query ? '&' + query : ''}`, { waitUntil: 'load' });
  try { await page.evaluate(() => window.ready); } catch (e) { await fail(e); }
  if (errors.length) await fail(errors[0]);
  const cdp = await page.createCDPSession();
  return {
    page,
    async frame(t) {
      await page.evaluate(t => window.seek(t), t);
      const { data } = await cdp.send('Page.captureScreenshot', {
        format: 'png', clip: { x: 0, y: 0, width: W, height: H, scale: 1 },
      });
      if (errors.length) throw errors[0];
      return Buffer.from(data, 'base64');
    },
    async close() { await browser.close(); server.close(); },
  };
}
```

- [ ] **Step 5: rng + timeline + state**

```js
// src/rng.js
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Stateless noise for "item i, channel k" lookups.
export function hash01(...ints) {
  let h = 0x9E3779B9;
  for (const n of ints) h = Math.imul(h ^ (n | 0), 0x85EBCA6B) ^ (h >>> 13);
  return mulberry32(h)();
}
```

```js
// src/timeline.js
export const BPM = 120;
export const BEAT = 60 / BPM;
export const DURATION = 15;
export const FPS = 60;
export const BEATS = 30;
export const beatTime = b => b * BEAT;

export const clamp01 = x => Math.min(1, Math.max(0, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const prog = (t, t0, t1) => clamp01((t - t0) / (t1 - t0));

export const ease = {
  linear: x => x,
  outCubic: x => 1 - (1 - x) ** 3,
  inOutCubic: x => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2),
  outExpo: x => (x >= 1 ? 1 : 1 - 2 ** (-10 * x)),
  inOutExpo: x => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? 2 ** (20 * x - 10) / 2 : (2 - 2 ** (-20 * x + 10)) / 2),
  outBack: x => 1 + 2.70158 * (x - 1) ** 3 + 1.70158 * (x - 1) ** 2,
};
```

```js
// src/state.js  (Task 1 version — Task 4 replaces the body)
export const STARTUP_CAM = { pos: [10.9, 7.9, 10.9], target: [0, 0, 0], fov: 44, ortho: false, orthoHeight: 0 };

export function stateAt(t) {
  return {
    t,
    view: { mode: 'solid', cube: 1, cubeSelected: true, rise: 0, windows: 0, dof: 0, overlays: 1, camera: STARTUP_CAM },
  };
}
```

- [ ] **Step 6: Page, styles, main, preview**

```html
<!-- index.html -->
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>One Connector</title>
  <link rel="stylesheet" href="src/styles.css">
  <script type="importmap">
    { "imports": {
        "three": "/node_modules/three/build/three.module.js",
        "three/addons/": "/node_modules/three/examples/jsm/" } }
  </script>
</head>
<body>
  <div id="stage">
    <canvas id="gl" width="1920" height="1080"></canvas>
  </div>
  <script type="module" src="src/main.js"></script>
</body>
</html>
```

```css
/* src/styles.css */
@import url('/node_modules/@fontsource/geist-sans/400.css');
@import url('/node_modules/@fontsource/geist-sans/500.css');
@import url('/node_modules/@fontsource/geist-sans/600.css');
@import url('/node_modules/@fontsource/geist-mono/400.css');
@import url('/node_modules/@fontsource/instrument-serif/400.css');

:root {
  --bg: #141414; --panel: #1D1D1D; --panel-2: #2B2B2B; --header: #303030;
  --viewport: #3D3D3D; --text: #F0EEE6; --accent: #D97757;
  --ui: 'Geist Sans', sans-serif; --mono: 'Geist Mono', monospace; --display: 'Instrument Serif', serif;
}
html, body { margin: 0; background: var(--bg); overflow: hidden; }
#stage { position: relative; width: 1920px; height: 1080px; overflow: hidden; background: var(--bg);
         transform-origin: 0 0; font-family: var(--ui); color: var(--text); }
#gl { position: absolute; inset: 0; width: 1920px; height: 1080px; display: block; }
#preview { position: fixed; left: 0; right: 0; bottom: 0; height: 44px; display: flex; gap: 12px;
           align-items: center; padding: 0 16px; background: #000; color: #fff; font: 13px var(--mono); }
#preview input { flex: 1; }
```

```js
// src/main.js
import { DURATION } from './timeline.js';
import { stateAt } from './state.js';
import { createViewport } from './scene/viewport.js';

const params = new URLSearchParams(location.search);
const clampT = t => {
  const n = Number(t);
  return Number.isFinite(n) ? Math.min(Math.max(n, 0), DURATION - 1e-6) : 0;
};

let apply = null;
window.ready = (async () => {
  await Promise.all([
    document.fonts.load('400 20px "Geist Sans"'), document.fonts.load('400 20px "Geist Mono"'),
    document.fonts.load('400 20px "Instrument Serif"'),
  ]);
  const viewport = await createViewport(document.getElementById('gl'), params);
  apply = s => viewport.update(s);
  window.seek(0);
})();

window.seek = t => {
  if (!apply) throw new Error('seek() called before window.ready resolved');
  apply(stateAt(clampT(t)));
};

if (params.has('preview')) {
  await window.ready;
  const { mountPreview } = await import('./preview.js');
  mountPreview(window.seek, DURATION);
}
```

```js
// src/preview.js — the only place requestAnimationFrame is allowed.
export function mountPreview(seek, duration) {
  const stage = document.getElementById('stage');
  const fit = () => { stage.style.transform = `scale(${Math.min(innerWidth / 1920, (innerHeight - 44) / 1080)})`; };
  fit(); addEventListener('resize', fit);
  const bar = document.createElement('div');
  bar.id = 'preview';
  bar.innerHTML = `<button>play</button><input type="range" min="0" max="${duration}" step="${1 / 60}" value="0"><span>0.00</span>`;
  document.body.append(bar);
  const [btn, range, label] = bar.children;
  let playing = false, start = 0, from = 0;
  const show = t => { range.value = t; label.textContent = t.toFixed(2); seek(t); };
  range.addEventListener('input', () => { playing = false; show(+range.value); });
  btn.addEventListener('click', () => {
    playing = !playing;
    from = +range.value >= duration - 0.05 ? 0 : +range.value;
    start = performance.now();
    if (playing) requestAnimationFrame(tick);
  });
  function tick(now) {
    if (!playing) return;
    const t = from + (now - start) / 1000;
    if (t >= duration) { playing = false; show(duration - 1e-6); return; }
    show(t);
    requestAnimationFrame(tick);
  }
}
```

- [ ] **Step 7: Viewport + Blender default scene**

```js
// src/scene/defaultScene.js
import * as THREE from 'three';

// Blender startup scene in three.js axes (Blender x,y,z → three x,z,-y).
export function createDefaultScene() {
  const group = new THREE.Group();

  const grid = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uOpacity: { value: 1 } },
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `
      varying vec3 vW; uniform float uOpacity;
      float line(vec2 p, float s){ vec2 g = abs(fract(p/s - .5) - .5) / fwidth(p/s); return 1. - min(min(g.x, g.y), 1.); }
      void main(){
        vec2 p = vW.xz;
        float fade = 1. - smoothstep(12., 60., length(cameraPosition.xz - p) * .6 + length(p) * .4);
        float g1 = line(p, 1.) * .35, g10 = line(p, 10.) * .55;
        vec3 col = vec3(.33);
        float a = max(g1, g10);
        float ax = 1. - min(abs(p.y) / fwidth(p.y), 1.);   // X axis (three z = 0)
        float ay = 1. - min(abs(p.x) / fwidth(p.x), 1.);   // Blender Y axis (three x = 0)
        col = mix(col, vec3(.76, .27, .31), ax); a = max(a, ax * .9);
        col = mix(col, vec3(.50, .64, .23), ay); a = max(a, ay * .9);
        gl_FragColor = vec4(col, a * fade * uOpacity);
      }`,
  }));
  grid.rotation.x = -Math.PI / 2;
  grid.renderOrder = -1;
  group.add(grid);

  const cube = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.6 }));
  cube.name = 'Cube';
  group.add(cube);

  const wire = new THREE.LineBasicMaterial({ color: 0x000000 });
  const camGizmo = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(cameraPyramid()), wire);
  camGizmo.position.set(7.36, 4.96, 6.93);
  camGizmo.lookAt(0, 0, 0);
  group.add(camGizmo);

  const lamp = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(lampGizmo()), wire);
  lamp.position.set(4.08, 5.9, -1.0);
  group.add(lamp);

  return {
    group, cube,
    update(v) {
      cube.visible = v.cube > 0.001;
      cube.scale.setScalar(Math.max(v.cube, 0.001));
      grid.material.uniforms.uOpacity.value = v.overlays;
      camGizmo.visible = lamp.visible = v.overlays > 0.5;
    },
  };
}

function cameraPyramid() {
  const s = 0.5, d = 1.0, P = THREE.Vector3;
  const o = new P(0, 0, 0), c = [new P(-s, -s * .56, -d), new P(s, -s * .56, -d), new P(s, s * .56, -d), new P(-s, s * .56, -d)];
  const tri = [new P(-s * .5, s * .66, -d), new P(s * .5, s * .66, -d), new P(0, s * 1.05, -d)];
  return [o, c[0], o, c[1], o, c[2], o, c[3], c[0], c[1], c[1], c[2], c[2], c[3], c[3], c[0], tri[0], tri[1], tri[1], tri[2], tri[2], tri[0]];
}

function lampGizmo() {
  const pts = [], r = 0.18, P = THREE.Vector3;
  for (let i = 0; i < 24; i++) {
    const a0 = (i / 24) * Math.PI * 2, a1 = ((i + 1) / 24) * Math.PI * 2;
    pts.push(new P(Math.cos(a0) * r, Math.sin(a0) * r, 0), new P(Math.cos(a1) * r, Math.sin(a1) * r, 0));
  }
  pts.push(new P(0, 0, 0), new P(0, -5.9, 0));
  return pts;
}
```

```js
// src/scene/viewport.js  (Task 1 version — Task 2 extends)
import * as THREE from 'three';
import { createDefaultScene } from './defaultScene.js';

export const VIEW_W = 1920, VIEW_H = 1080;

export async function createViewport(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  if (!renderer.getContext()) throw new Error('WebGL context unavailable');
  renderer.setPixelRatio(1);
  renderer.setSize(VIEW_W, VIEW_H, false);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x3d3d3d);
  const camera = new THREE.PerspectiveCamera(44, VIEW_W / VIEW_H, 0.05, 2000);
  const def = createDefaultScene();
  scene.add(def.group);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x3a3a3a, 2.0));
  const key = new THREE.DirectionalLight(0xffffff, 1.8);
  key.position.set(-5, 12, 8);
  scene.add(key);

  return {
    update(s) {
      def.update(s.view);
      applyCamera(camera, s.view.camera);
      renderer.render(scene, camera);
    },
  };
}

// 'ortho' is a very long lens from far away: visually orthographic, same camera for every pass.
export function applyCamera(camera, c) {
  if (c.ortho) {
    camera.fov = 2;
    const dist = c.orthoHeight / 2 / Math.tan((camera.fov / 2) * Math.PI / 180);
    camera.position.set(c.target[0], c.target[1] + dist, c.target[2]);
    camera.up.set(0, 0, -1);
  } else {
    camera.fov = c.fov;
    camera.position.set(...c.pos);
    camera.up.set(0, 1, 0);
  }
  camera.near = 0.05;
  camera.far = c.ortho ? camera.position.y + 50 : 2000;
  camera.lookAt(...c.target);
  camera.updateProjectionMatrix();
}
```

- [ ] **Step 8: Run tests, check they pass; eyeball a frame**

Run: `node --test test/determinism.test.mjs`
Expected: 2 tests PASS.
Run: `npm run preview` and open the printed URL: grey viewport, Blender grid with red/green axes, grey cube, black camera and lamp gizmos. If headless capture is black, add `--enable-unsafe-swiftshader` with `--use-angle=swiftshader` to `stage.mjs` args and re-run.

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "feat: seek contract, stage harness and Blender default scene"
```

---

### Task 2: Look-dev — the city (GATE: user approves stills)

**Files:**
- Create: `assets/claude-spark.svg`, `assets/blender-logo.svg`, `src/spark.js`, `src/scene/cityData.js`, `src/scene/city.js`, `src/scene/post.js`, `tools/still.mjs`
- Modify: `src/scene/viewport.js`, `src/main.js`

**Interfaces:**
- Consumes: `hash01`, `mulberry32`, `applyCamera`, `createDefaultScene`, `openStage(query)`.
- Produces: `loadSparkMask(url, n) → Promise<Uint8Array>` (row 0 = image top = three −z); `buildCityData(mask, n) → { parts, tanks, lights, cars, trees, maxRing }`; `createCity(data) → { group, update(view, t) }`; `createPost(renderer, scene, camera) → { composer, outline, update(view) }`; view fields used: `mode`, `rise` (ring front 0…1.25), `windows` (front 0…1.3), `dof` (0…1), `overlays`; `LOOKS` look-dev states in `src/state.js`; `?look=<name>` makes `stateAt` return that look.

- [ ] **Step 1: Fetch brand assets and look at them**

```bash
mkdir -p assets ref
curl -fsSL -o assets/claude-spark.svg 'https://commons.wikimedia.org/wiki/Special:FilePath/Claude_AI_symbol.svg'
curl -fsSL -o assets/blender-logo.svg 'https://commons.wikimedia.org/wiki/Special:FilePath/Blender_logo_no_text.svg'
head -c 400 assets/claude-spark.svg; echo; head -c 400 assets/blender-logo.svg
```
Expected: both start with `<svg` (or an XML prolog). Rasterise each with `/opt/homebrew/bin/blender`-free route: `qlmanage -t -s 512 -o ref assets/claude-spark.svg` and open the PNG to confirm the spark shape. The spark SVG must have `width`/`height` attributes; if it only has a `viewBox`, add `width="512" height="512"` to the root element.

- [ ] **Step 2: Spark mask**

```js
// src/spark.js
export async function loadSparkMask(url, n) {
  const img = new Image();
  img.src = url;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = c.height = n;
  const g = c.getContext('2d', { willReadFrequently: true });
  const m = Math.round(n * 0.03);
  g.drawImage(img, m, m, n - 2 * m, n - 2 * m);
  const px = g.getImageData(0, 0, n, n).data;
  const mask = new Uint8Array(n * n);
  for (let i = 0; i < n * n; i++) mask[i] = px[i * 4 + 3] > 110 ? 1 : 0;
  return mask;
}
```

- [ ] **Step 3: City data (pure)**

```js
// src/scene/cityData.js
import { hash01 } from '../rng.js';

export const LOTS = 72;           // mask resolution, 2×2 lots per block
export const BLOCK = 1.0;         // block pitch (world units)
export const STREET = 0.16;       // street width
const HALF_BLOCKS = LOTS / 4;     // 18 blocks each side of origin
const LOT_OFF = (BLOCK - STREET) / 4;

const lotX = c => (Math.floor(c / 2) - HALF_BLOCKS + 0.5) * BLOCK + (c % 2 ? LOT_OFF : -LOT_OFF);
const lotZ = r => (Math.floor(r / 2) - HALF_BLOCKS + 0.5) * BLOCK + (r % 2 ? LOT_OFF : -LOT_OFF);

// kind: 0 facade with windows, 1 podium/shopfront, 2 plain prop
export function buildCityData(mask) {
  const parts = [], tanks = [], trees = [], lights = [], cars = [];
  const spanR = HALF_BLOCKS * BLOCK;
  const blockHas = new Uint8Array((LOTS / 2) ** 2);
  let maxRing = 0;

  for (let r = 0; r < LOTS; r++) for (let c = 0; c < LOTS; c++) {
    if (!mask[r * LOTS + c]) continue;
    blockHas[(r >> 1) * (LOTS / 2) + (c >> 1)] = 1;
    const id = r * LOTS + c;
    const x = lotX(c), z = lotZ(r);
    const d = Math.min(1, Math.hypot(x, z) / spanR);
    const ring = Math.hypot(x, z);
    maxRing = Math.max(maxRing, ring);
    let h = (0.22 + 1.7 * (1 - d) ** 2.2) * (0.55 + 0.9 * hash01(id, 1));
    const landmark = hash01(id, 2) < 0.03 && d < 0.55;
    if (landmark) h = Math.min(h * 1.75, 3.4);
    const w = 0.30 + 0.06 * hash01(id, 3), dp = 0.30 + 0.06 * hash01(id, 4);
    const seed = hash01(id, 5);
    let y = 0;
    if (h > 0.8) { parts.push({ x, z, y0: 0, h: 0.1, w: 0.4, d: 0.4, kind: 1, seed, ring }); y = 0.1; }
    const tiers = h > 1.3 ? 3 : h > 0.65 ? 2 : 1;
    const split = tiers === 3 ? [0.56, 0.3, 0.14] : tiers === 2 ? [0.72, 0.28] : [1];
    const shrink = [1, 0.8 - 0.06 * hash01(id, 6), 0.6 - 0.06 * hash01(id, 7)];
    const ox = (hash01(id, 8) - 0.5) * 0.03, oz = (hash01(id, 9) - 0.5) * 0.03;
    for (let i = 0; i < tiers; i++) {
      const th = (h - y) * split[i] / split.slice(i).reduce((a, b) => a + b, 0);
      parts.push({ x: x + ox * i, z: z + oz * i, y0: y, h: th, w: w * shrink[i], d: dp * shrink[i], kind: 0, seed, ring });
      y += th;
    }
    const topW = w * shrink[tiers - 1], topD = dp * shrink[tiers - 1];
    const props = 1 + Math.floor(hash01(id, 10) * 3);
    for (let k = 0; k < props; k++) {
      const s = 0.035 + 0.035 * hash01(id, 20 + k);
      parts.push({ x: x + (hash01(id, 30 + k) - 0.5) * (topW - s), z: z + (hash01(id, 40 + k) - 0.5) * (topD - s),
                   y0: y, h: 0.02 + 0.03 * hash01(id, 50 + k), w: s, d: s * 0.8, kind: 2, seed, ring });
    }
    if (h < 1.1 && hash01(id, 11) < 0.45) tanks.push({ x: x - topW * 0.22, z: z + topD * 0.2, y0: y, ring });
    if (landmark) parts.push({ x, z, y0: y, h: 0.45, w: 0.012, d: 0.012, kind: 2, seed, ring });
  }

  const B = LOTS / 2;
  for (let bz = 0; bz <= B; bz++) for (let bx = 0; bx <= B; bx++) {
    const near = [[bz - 1, bx - 1], [bz - 1, bx], [bz, bx - 1], [bz, bx]]
      .some(([a, b]) => a >= 0 && b >= 0 && a < B && b < B && blockHas[a * B + b]);
    const x = (bx - HALF_BLOCKS) * BLOCK, z = (bz - HALF_BLOCKS) * BLOCK;
    if (near) lights.push({ x: x + STREET * 0.5, z: z + STREET * 0.5, ring: Math.hypot(x, z) });
  }
  for (let bz = 0; bz < B; bz++) for (let bx = 0; bx < B; bx++) {
    const cx = (bx - HALF_BLOCKS + 0.5) * BLOCK, cz = (bz - HALF_BLOCKS + 0.5) * BLOCK;
    const bid = bz * B + bx;
    if (blockHas[bid]) {
      for (let k = 0; k < 2; k++) if (hash01(bid, 60 + k) < 0.7) {
        const alongX = k === 0;
        cars.push({ alongX, x: alongX ? cx : cx + BLOCK / 2, z: alongX ? cz + BLOCK / 2 : cz,
                    dir: hash01(bid, 70 + k) < 0.5 ? 1 : -1, phase: hash01(bid, 80 + k), speed: 0.35 + 0.3 * hash01(bid, 90 + k) });
      }
    } else if (Math.hypot(cx, cz) < spanR * 1.05) {
      const n = Math.floor(hash01(bid, 100) * 4);
      for (let k = 0; k < n; k++) trees.push({ x: cx + (hash01(bid, 110 + k) - 0.5) * 0.7, z: cz + (hash01(bid, 120 + k) - 0.5) * 0.7,
                                              s: 0.6 + 0.6 * hash01(bid, 130 + k) });
    }
  }
  for (const p of [...parts, ...tanks, ...lights]) p.ring /= maxRing;
  return { parts, tanks, trees, lights, cars, maxRing };
}
```

- [ ] **Step 4: City meshes + window shader**

```js
// src/scene/city.js
import * as THREE from 'three';
import { BLOCK, STREET } from './cityData.js';
import { clamp01, ease } from '../timeline.js';

const CREAM = new THREE.Color('#F0EEE6').convertSRGBToLinear();
const ORANGE = new THREE.Color('#D97757').convertSRGBToLinear();

export function createCity(data) {
  const group = new THREE.Group();
  const uniforms = { uMode: { value: 0 }, uWindows: { value: 0 } };

  // --- buildings: one instanced unit box, matrices rewritten from view.rise every frame
  const box = new THREE.BoxGeometry(1, 1, 1);
  const n = data.parts.length;
  const seedA = new Float32Array(n), kindA = new Float32Array(n), ringA = new Float32Array(n);
  data.parts.forEach((p, i) => { seedA[i] = p.seed; kindA[i] = p.kind; ringA[i] = p.ring; });
  box.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seedA, 1));
  box.setAttribute('aKind', new THREE.InstancedBufferAttribute(kindA, 1));
  box.setAttribute('aRing', new THREE.InstancedBufferAttribute(ringA, 1));
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, metalness: 0 });
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, uniforms, { uCream: { value: CREAM }, uOrange: { value: ORANGE } });
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        attribute float aSeed; attribute float aKind; attribute float aRing;
        varying vec3 vWPos; varying vec3 vONormal; varying float vSeed; varying float vKind; varying float vRing;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vWPos = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
        vONormal = normal; vSeed = aSeed; vKind = aKind; vRing = aRing;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uMode; uniform float uWindows; uniform vec3 uCream; uniform vec3 uOrange;
        varying vec3 vWPos; varying vec3 vONormal; varying float vSeed; varying float vKind; varying float vRing;
        float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
        float winMask(vec2 f){ return step(.18, f.x) * step(f.x, .82) * step(.24, f.y) * step(f.y, .86); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float side = 1. - step(.5, abs(vONormal.y));
        vec2 fc = abs(vONormal.x) > .5 ? vec2(vWPos.z, vWPos.y) : vec2(vWPos.x, vWPos.y);
        vec2 cell = vKind > .5 ? vec2(.09, .1) : vec2(.045, .06);
        vec2 g = fc / cell; vec2 id = floor(g); vec2 f = fract(g);
        float aa = clamp(1.6 - max(fwidth(g.x), fwidth(g.y)) * 2.2, 0., 1.);
        float win = mix(.42, winMask(f), aa) * side * step(vKind, 1.5);
        float inset = side * aa * winMask(f) * (1. - smoothstep(.24, .34, f.y));
        float wall = uMode < .5 ? .78 + .08 * vSeed : .20 + .12 * vSeed;
        float glass = uMode < .5 ? .62 : .035;
        diffuseColor.rgb = vec3(mix(wall, glass, win) * (1. - .35 * inset));
        float hw = h21(id + vSeed * 91.7);
        float front = uWindows * 1.3 - vRing - hw * .25;
        float lit = step(hw, .58) * smoothstep(0., .04, front) * uMode;
        vec3 wcol = mix(uCream, uOrange, step(.55, h21(id.yx + vSeed * 13.1))) * (.55 + .45 * h21(id * 1.7));
        vec3 winEmit = wcol * lit * mix(.58 * 2.6, 2.6, aa) * win;`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, .18, win * uMode);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += winEmit * 2.2;`);
  };
  const buildings = new THREE.InstancedMesh(box, mat, n);
  buildings.castShadow = buildings.receiveShadow = true;
  buildings.frustumCulled = false;
  group.add(buildings);

  // --- water tanks
  const tankGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.05, 14);
  const tanks = new THREE.InstancedMesh(tankGeo, new THREE.MeshStandardMaterial({ color: 0x9a9a9a, roughness: 0.7 }), data.tanks.length);
  tanks.castShadow = true; tanks.frustumCulled = false;
  group.add(tanks);

  // --- ground with streets
  const groundMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 });
  groundMat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, uniforms, { uCream: { value: CREAM } });
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vXZ;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvXZ = (modelMatrix * vec4(transformed, 1.)).xz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uMode; uniform vec3 uCream; varying vec2 vXZ;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec2 q = fract(vXZ / ${BLOCK.toFixed(3)});
        vec2 e = min(q, 1. - q) * ${BLOCK.toFixed(3)};
        float road = 1. - step(${(STREET / 2).toFixed(3)}, min(e.x, e.y));
        float walk = (1. - step(${(STREET / 2 + 0.03).toFixed(3)}, min(e.x, e.y))) * (1. - road);
        float dash = step(.5, fract((e.x < e.y ? vXZ.y : vXZ.x) * 6.)) * (1. - step(.006, min(e.x, e.y)));
        float edgeFade = smoothstep(26., 19., length(vXZ));
        float base = uMode < .5 ? .52 : .022;
        float c = mix(base, uMode < .5 ? .46 : .012, road) + walk * (uMode < .5 ? .06 : .02);
        diffuseColor.rgb = vec3(mix(uMode < .5 ? .52 : .015, c, edgeFade));
        float mark = dash * road * edgeFade;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += uCream * mark * .25 * uMode;`);
  };
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.001;
  ground.receiveShadow = true;
  group.add(ground);

  // --- trees (parks outside the spark)
  const treeGeo = new THREE.IcosahedronGeometry(0.07, 1);
  const trees = new THREE.InstancedMesh(treeGeo, new THREE.MeshStandardMaterial({ color: 0x55594f, roughness: 1, flatShading: true }), data.trees.length);
  trees.castShadow = true; trees.frustumCulled = false;
  group.add(trees);

  // --- streetlights: pole + emissive head
  const lampGeo = new THREE.SphereGeometry(0.012, 8, 6);
  const lampMat = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: CREAM, emissiveIntensity: 0 });
  const lamps = new THREE.InstancedMesh(lampGeo, lampMat, data.lights.length);
  lamps.frustumCulled = false;
  group.add(lamps);

  // --- cars: body + light streak (head = cream front, tail = orange back)
  const carBody = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 0.022, 0.028), new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.4 }), data.cars.length);
  const headMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: CREAM, emissiveIntensity: 0 });
  const tailMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: ORANGE, emissiveIntensity: 0 });
  const streak = new THREE.BoxGeometry(0.05, 0.006, 0.02);
  const heads = new THREE.InstancedMesh(streak, headMat, data.cars.length);
  const tails = new THREE.InstancedMesh(streak, tailMat, data.cars.length);
  for (const m of [carBody, heads, tails]) { m.frustumCulled = false; group.add(m); }

  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), S = new THREE.Vector3();
  const riseScale = (front, ring) => {
    const k = clamp01((front * 1.25 - ring) / 0.22);
    return k <= 0 ? 0 : ease.outBack(k);
  };

  return {
    group,
    update(v, t) {
      uniforms.uMode.value = v.mode === 'rendered' ? 1 : 0;
      uniforms.uWindows.value = v.windows;
      const a = buildings.instanceMatrix.array;
      data.parts.forEach((p, i) => {
        const s = riseScale(v.rise, p.ring);
        const o = i * 16;
        a.fill(0, o, o + 16);
        a[o] = p.w; a[o + 5] = Math.max(p.h * s, 1e-5); a[o + 10] = p.d; a[o + 15] = 1;
        a[o + 12] = p.x; a[o + 13] = (p.y0 + p.h / 2) * s; a[o + 14] = p.z;
      });
      buildings.instanceMatrix.needsUpdate = true;
      data.tanks.forEach((p, i) => {
        const s = riseScale(v.rise, p.ring);
        tanks.setMatrixAt(i, M.compose(P.set(p.x, (p.y0 + 0.025) * s, p.z), Q.identity(), S.set(1, Math.max(s, 1e-5), 1)));
      });
      tanks.instanceMatrix.needsUpdate = true;
      const treeGrow = clamp01((v.rise - 0.9) / 0.3);
      data.trees.forEach((p, i) => {
        const s = p.s * Math.max(ease.outBack(treeGrow), 1e-5);
        trees.setMatrixAt(i, M.compose(P.set(p.x, 0.07 * s, p.z), Q.identity(), S.set(s, s * 1.3, s)));
      });
      trees.instanceMatrix.needsUpdate = true;
      const night = v.mode === 'rendered' ? 1 : 0;
      data.lights.forEach((p, i) => {
        const on = clamp01((v.windows * 1.3 - p.ring) / 0.05) * night;
        lamps.setMatrixAt(i, M.compose(P.set(p.x, 0.07, p.z), Q.identity(), S.setScalar(on > 0 ? 1 : 1e-5)));
      });
      lamps.instanceMatrix.needsUpdate = true;
      lampMat.emissiveIntensity = 6 * night;
      const carsOn = clamp01((v.rise - 1.0) / 0.2);
      data.cars.forEach((c, i) => {
        const span = BLOCK - STREET;
        const u = ((c.phase + c.speed * t * c.dir) % 1 + 1) % 1;
        const along = (u - 0.5) * span;
        const fade = Math.min(1, u / 0.08, (1 - u) / 0.08) * carsOn;
        const lane = 0.03 * c.dir;
        const x = c.alongX ? c.x + along : c.x + lane, z = c.alongX ? c.z + lane : c.z + along;
        Q.setFromAxisAngle(P.set(0, 1, 0), c.alongX ? (c.dir > 0 ? 0 : Math.PI) : (c.dir > 0 ? -Math.PI / 2 : Math.PI / 2));
        const sc = Math.max(fade, 1e-5);
        carBody.setMatrixAt(i, M.compose(P.set(x, 0.011, z), Q, S.setScalar(sc)));
        const fx = c.alongX ? c.dir : 0, fz = c.alongX ? 0 : -c.dir;
        heads.setMatrixAt(i, M.compose(P.set(x + fx * 0.045, 0.012, z - fz * 0.045), Q, S.setScalar(sc)));
        tails.setMatrixAt(i, M.compose(P.set(x - fx * 0.045, 0.012, z + fz * 0.045), Q, S.setScalar(sc)));
      });
      for (const m of [carBody, heads, tails]) m.instanceMatrix.needsUpdate = true;
      headMat.emissiveIntensity = 5 * night;
      tailMat.emissiveIntensity = 4 * night;
      group.visible = v.rise > 0;
    },
  };
}
```

- [ ] **Step 5: Post stack**

```js
// src/scene/post.js
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export function createPost(renderer, scene, camera, w, h) {
  const target = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, target);
  composer.setPixelRatio(1);
  composer.setSize(w, h);
  composer.addPass(new RenderPass(scene, camera));
  const gtao = new GTAOPass(scene, camera, w, h);
  gtao.blendIntensity = 0.9;
  gtao.updateGtaoMaterial({ radius: 0.35, distanceExponent: 1.4, thickness: 1.2, scale: 1.0, samples: 16 });
  composer.addPass(gtao);
  const outline = new OutlinePass(new THREE.Vector2(w, h), scene, camera);
  outline.visibleEdgeColor.set('#D97757');
  outline.hiddenEdgeColor.set('#D97757');
  outline.edgeStrength = 6; outline.edgeThickness = 1; outline.edgeGlow = 0; outline.pulsePeriod = 0;
  composer.addPass(outline);
  const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.9, 0.55, 1.0);
  composer.addPass(bloom);
  const bokeh = new BokehPass(scene, camera, { focus: 6, aperture: 0.0, maxblur: 0.008 });
  composer.addPass(bokeh);
  composer.addPass(new OutputPass());
  return {
    composer, outline,
    update(v, focusDist) {
      bloom.enabled = v.mode === 'rendered';
      bloom.strength = 0.9;
      bokeh.enabled = v.dof > 0.001;
      bokeh.uniforms.aperture.value = 0.0035 * v.dof;
      bokeh.uniforms.focus.value = focusDist;
    },
  };
}
```
Note: before writing, open `node_modules/three/examples/jsm/postprocessing/GTAOPass.js` and confirm the constructor signature and that it uses no `Math.random`; if it does, pass a fixed noise texture (its `generateNoise` hook) or set `gtao.output` and replace the noise generator with `mulberry32`.

- [ ] **Step 6: Viewport modes + look-dev states**

Replace `src/scene/viewport.js` with:

```js
import * as THREE from 'three';
import { createDefaultScene } from './defaultScene.js';
import { createCity } from './city.js';
import { buildCityData, LOTS } from './cityData.js';
import { createPost } from './post.js';
import { loadSparkMask } from '../spark.js';

export const VIEW_W = 1920, VIEW_H = 1080;
const SOLID_BG = new THREE.Color(0x3d3d3d), NIGHT_BG = new THREE.Color(0x07080a);

export async function createViewport(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  if (!renderer.getContext()) throw new Error('WebGL context unavailable');
  renderer.setPixelRatio(1);
  renderer.setSize(VIEW_W, VIEW_H, false);
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(44, VIEW_W / VIEW_H, 0.05, 2000);
  const def = createDefaultScene();
  scene.add(def.group);

  const mask = await loadSparkMask('/assets/claude-spark.svg', LOTS);
  const city = createCity(buildCityData(mask));
  scene.add(city.group);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x3a3a3a, 2.0);
  const key = new THREE.DirectionalLight(0xffffff, 1.8);
  key.castShadow = true;
  key.shadow.mapSize.set(4096, 4096);
  Object.assign(key.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 80 });
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
  scene.add(hemi, key, key.target);

  const post = createPost(renderer, scene, camera, VIEW_W, VIEW_H);
  post.outline.selectedObjects = [def.cube];
  const look = (night) => {
    scene.background = night ? NIGHT_BG : SOLID_BG;
    scene.fog = night ? new THREE.FogExp2(0x07080a, 0.028) : null;
    hemi.color.set(night ? 0x8d93a0 : 0xffffff);
    hemi.groundColor.set(night ? 0x050505 : 0x3a3a3a);
    hemi.intensity = night ? 0.18 : 2.0;
    key.color.set(night ? 0xc9cfdb : 0xffffff);
    key.intensity = night ? 0.35 : 1.8;
    key.position.set(night ? 14 : -9, night ? 22 : 18, night ? -10 : 12);
  };

  return {
    update(s) {
      const v = s.view;
      look(v.mode === 'rendered');
      def.update(v);
      city.update(v, s.t);
      post.outline.enabled = v.cubeSelected && v.cube > 0.001;
      applyCamera(camera, v.camera);
      post.update(v, camera.position.distanceTo(new THREE.Vector3(...v.camera.target)));
      post.composer.render();
    },
  };
}
```
(keep `applyCamera` from Task 1 at the bottom of the file).

Add look-dev states to `src/state.js`:

```js
export const LOOKS = {
  solid: { mode: 'solid', cube: 0, cubeSelected: false, rise: 1.25, windows: 0, dof: 0, overlays: 1,
           camera: { pos: [17, 11, 19], target: [0, 0.8, 0], fov: 38, ortho: false, orthoHeight: 0 } },
  night: { mode: 'rendered', cube: 0, cubeSelected: false, rise: 1.25, windows: 1.3, dof: 0, overlays: 0,
           camera: { pos: [17, 11, 19], target: [0, 0.8, 0], fov: 38, ortho: false, orthoHeight: 0 } },
  street: { mode: 'rendered', cube: 0, cubeSelected: false, rise: 1.25, windows: 1.3, dof: 1, overlays: 0,
            camera: { pos: [6.2, 0.55, 9.0], target: [0.5, 1.1, 0], fov: 50, ortho: false, orthoHeight: 0 } },
  top: { mode: 'rendered', cube: 0, cubeSelected: false, rise: 1.25, windows: 1.3, dof: 0, overlays: 0,
         camera: { pos: [0, 0, 0], target: [0, 0, 0], fov: 0, ortho: true, orthoHeight: 38 } },
};
const lookParam = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('look') : null;
```
and at the top of `stateAt`: `if (lookParam && LOOKS[lookParam]) return { t, view: LOOKS[lookParam] };`

- [ ] **Step 7: Still tool**

```js
// tools/still.mjs  — node tools/still.mjs --look night | --t 7.5   [--out path]
import { writeFile, mkdir } from 'node:fs/promises';
import { openStage } from './stage.mjs';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []));
const stage = await openStage(args.look ? `look=${args.look}` : '');
try {
  const png = await stage.frame(Number(args.t ?? 0));
  await mkdir('out', { recursive: true });
  const out = args.out ?? `out/${args.look ? 'lookdev-' + args.look : 't' + args.t}.png`;
  await writeFile(out, png);
  console.log(out);
} finally { await stage.close(); }
```

- [ ] **Step 8: Render the four stills and LOOK at them**

Run: `for l in solid night street top; do node tools/still.mjs --look $l; done`
Open each PNG (Read tool). Iterate on `cityData.js` / `city.js` / `post.js` constants until: towers read as architecture (tiers, props, window grids) not columns; no window moiré at distance; night has depth (haze, bloom only on lights); top view clearly reads as Claude's spark. Re-run `node --test test/` — still PASS.

- [ ] **Step 9: Commit, then STOP — show the user `out/lookdev-*.png` and wait for approval of the look**

```bash
git add -A && git commit -m "feat: procedural spark city look-dev"
```

---

### Task 3: Blender + Claude windows on the stage (presentation framing)

**Files:**
- Create: `src/ui/blender.js`, `src/ui/claude.js`, `src/ui/framing.js`, `ref/` screenshots
- Modify: `index.html`, `src/styles.css`, `src/main.js`, `src/state.js`

**Interfaces:**
- Consumes: viewport canvas `#gl` (moves inside the Blender viewport region; drawing buffer stays 1920×1080, region is 16:9 so CSS scaling never distorts).
- Produces: `createBlenderUI(root) → { viewportEl, update(ui) }`, `createClaudeUI(root) → { update(ui) }`, `createFraming(stage, parts) → { update(ui) }`. `ui` state fields (added to `stateAt` in Task 4): `ui.focus` = `{ x, y, scale, rotY }` stage transform; `ui.viewFull` 0…1 (viewport expands to full frame, other chrome slides out); `ui.chat` = array of `{ role: 'user'|'claude', text, shown /*chars*/, tool?: { code: string[], open: 0…1 } }`; `ui.draft` = `{ text, shown }`; `ui.outliner` = `{ cube: bool, towers: number }`; `ui.overlayText` string; `ui.shading` 'solid'|'rendered'; `ui.viewLabel` 'User Perspective'|'Camera Perspective'|'Top Orthographic'; `ui.endCard` 0…1.

- [ ] **Step 1: Reference.** Fetch the Blender 5.0 release page (`https://www.blender.org/download/releases/5-0/`), download its main interface screenshot to `ref/blender-ui.png`, and open it. Note exact layout: top bar (menus + workspace tabs), viewport header (mode, View/Select/Add/Object, shading buttons right), top-left overlay text, navigation gizmo, Outliner tree rows, Properties tabs column, Timeline. Do the same for a Claude desktop dark-mode screenshot (claude.com product pages) → `ref/claude-ui.png`: input box, user bubble, assistant spark, tool-use row.
- [ ] **Step 2: Stage layout.** Stage `#stage` holds `#world` (the motion-camera layer) containing two windows: Claude window `left 64, top 170, 560×740`, Blender window `left 656, top 170, 1200×740`, 14 px radius, `box-shadow: 0 40px 120px rgba(0,0,0,.55)`, 1 px `#2B2B2B` border. Blender window inner: top bar 30 px, viewport header 30 px, viewport region exactly 880×495 (16:9) at left, right column 320 px (Outliner 300 px tall, Properties below), timeline strip below viewport. `#gl` is moved into the viewport region and sized `width:100%;height:100%`. All type ≥ 15 px in Blender chrome, ≥ 22 px in chat, prompts 26 px.
- [ ] **Step 3: `blender.js`.** Build the DOM once from the reference (simplified but faithful labels: `File Edit Render Window Help`, tabs `Layout Modeling Sculpting UV Editing Texture Paint Shading Animation`, header `Object Mode  View Select Add Object`, four shading buttons with the active one highlighted in `#D97757` when Rendered else neutral `#545454`), nav gizmo as inline SVG (desaturated red/green/blue circles X/Y/Z). `update(ui)` sets: overlay text (`User Perspective` / `Camera Perspective` / `Top Orthographic` + `(1) Collection | <name>`), active shading button, Outliner rows (`Collection` › `Camera`, `Cube` (if `ui.outliner.cube`), `Light`, then `Tower.001 … Tower.NNN` showing the last 9 rows so the list visibly scrolls, plus a count badge), `viewFull` (viewport region `transform` scales to cover the stage while chrome translates off-frame). Every property is assigned on every call.
- [ ] **Step 4: `claude.js`.** Header bar with spark (from `assets/claude-spark.svg`, orange) + "Claude". Messages column: user bubble `#141414` on `#262624` window, 26 px; Claude turn = spark avatar + a tool-call card (`#1D1D1D`, 1 px `#3A3A38` border, row "Blender" with connector glyph + chevron, body in Geist Mono 19 px showing `code` lines revealed by `open`). Input box at bottom with `draft.text.slice(0, draft.shown)` + caret (caret visibility = `Math.floor(t*2)%2`, passed in via `ui.caretOn`). Messages render bottom-aligned; when content overflows, translate up so the newest message sits above the input.
- [ ] **Step 5: `framing.js`.** `#world` transform = `translate(${-x}px, ${-y}px) scale(${scale}) rotateY(${rotY}deg)` around the stage centre with `perspective: 2400px` on `#stage`. End card layer (`#endcard`) above `#world`: left-aligned at x 120, y 700: "One connector." Instrument Serif 132 px cream; below, 56 px row: spark (orange) "×" Blender logo (CSS `filter` to cream) ; opacity & translateY from `ui.endCard` with outExpo (it slides up 40 px — not a fade-only reveal). A dim layer over `#world` at `0.55 * endCard`.
- [ ] **Step 6: Wire into `main.js`** (`apply = s => { blender.update(s.ui); claude.update(s.ui); framing.update(s.ui); viewport.update(s); }`) and give `stateAt` a static `ui` (overview focus, first prompt fully typed) so the layout can be checked. Run `node tools/still.mjs --t 0` and compare side by side with `ref/blender-ui.png` — fix anything that does not read as Blender. Run `node --test test/` → PASS.
- [ ] **Step 7: Commit** — `git commit -am "feat: Blender and Claude windows on the presentation stage"`

---

### Task 4: The timeline — `stateAt(t)` for all 30 beats

**Files:**
- Modify: `src/timeline.js` (add `PROMPTS`, `CUES`), `src/state.js` (full `stateAt`)

**Interfaces:**
- Produces: `PROMPTS: Array<{ text, typeFrom, typeTo, send /*beat*/, tool /*beat*/, code: string[] }>`; `CUES: Array<{ beat: number, kind: string, step?: number }>` — kinds `open, send, tool, delete, rise, night, windows, fly, top, resolve`.

- [ ] **Step 1: Prompts and cues** (append to `src/timeline.js`):

```js
export const PROMPTS = [
  { text: 'Delete the cube. Build me a city.', typeFrom: 0.1, typeTo: 0.9, send: 2, tool: 3,
    code: ['bpy.data.objects.remove(bpy.data.objects["Cube"])', 'for (x, y), h in lots.items():',
           '    bpy.ops.mesh.primitive_cube_add(location=(x, y, h / 2))'] },
  { text: 'Make it night. Light the windows.', typeFrom: 5.0, typeTo: 5.42, send: 11, tool: 11,
    code: ['scene.world.color = (0.01, 0.01, 0.012)', 'glass.inputs["Emission Strength"].default_value = 4.0'] },
  { text: 'Fly the camera through it.', typeFrom: 8.0, typeTo: 8.38, send: 17, tool: 17,
    code: ['cam.constraints.new("FOLLOW_PATH").target = avenue', 'cam.data.dof.use_dof = True'] },
  { text: 'Top view.', typeFrom: 11.0, typeTo: 11.22, send: 23, tool: 23,
    code: ['bpy.ops.view3d.view_axis(type="TOP")'] },
];

export const CUES = [
  { beat: 0, kind: 'open' }, { beat: 2, kind: 'send' }, { beat: 3, kind: 'tool' }, { beat: 4, kind: 'delete' },
  ...[5, 6, 7, 8, 9].map((beat, step) => ({ beat, kind: 'rise', step })),
  { beat: 11, kind: 'send' }, { beat: 12, kind: 'night' },
  ...[13, 14, 15].map((beat, step) => ({ beat, kind: 'windows', step })),
  { beat: 17, kind: 'fly' }, { beat: 23, kind: 'top' }, { beat: 28, kind: 'resolve' },
];
```
Every line is real bpy API (`bpy.data.objects.remove`, `bpy.ops.mesh.primitive_cube_add`, `World.color`, Principled BSDF `"Emission Strength"`, `FOLLOW_PATH` constraint, `dof.use_dof`, `view3d.view_axis`); `lots`, `glass`, `cam`, `avenue`, `scene` are ordinary local variables of the script.

- [ ] **Step 2: `stateAt(t)`** — implement as a list of pure segment functions keyed by the beat map in the spec. Requirements (each a pure function of t):
  - Focus keyframes (stage transforms) `overview` (scale 1), `chat` (scale 1.55 centred on the Claude window input), `viewport` (scale 1.35 centred on the viewport region), `outliner` (scale 1.6 on the Outliner); whips use `ease.inOutExpo` over 0.28 s ending exactly on the beat, with `rotY` ±4° peaking mid-whip; holds drift `scale += 0.02` per second. Order: chat 0–1.72, whip→viewport ends 2.0, viewport 2.0–3.5, outliner glance 3.5–4.5, viewport 4.5–4.72, whip→chat ends 5.0, chat 5.0–5.72, whip→viewport ends 6.0, viewport 6.0–7.72, whip→chat ends 8.0, chat 8.0–8.5, `viewFull` 0→1 over 8.5–9.0 (outExpo), full 9.0–10.75, `viewFull` 1→0 over 10.75–11.0, chat 11.0–11.22, whip→viewport ends 11.5, viewport 11.5–14.0 then overview with `endCard` 0→1 over 14.0–14.6.
  - `view.cube`: 1 until 2.0, then `1 - ease.outExpo(prog(t, 2.0, 2.12))` with a 1.08 scale bump on 1.95–2.0. `cubeSelected` true until 2.0.
  - `view.rise`: `ease.inOutCubic(prog(t, 2.5, 5.0)) * 1.25`, quantised so each ring band starts on its beat: `rise = (Math.floor(prog*5) + ease.outCubic(fract(prog*5))) / 5 * 1.25`.
  - `view.mode`: `'rendered'` from t ≥ 6.0. `view.windows`: per-beat fronts across 6.5–8.0, same quantisation as rise, `* 1.3`.
  - `view.camera`: 0–2 Blender startup view (`STARTUP_CAM`); 2–6 orbit radius 22→26, height 13→15, azimuth 40°→70°, target y 0.6; 6–8.5 slow dolly in; 9.0–10.75 fly-through along a Catmull-Rom path at y≈0.5–0.9 between towers ending at downtown (`dof` 1); 11.5 snap: 0.3 s smooth-view rotation to top then `ortho: true, orthoHeight: 38`; 11.8–14 push `orthoHeight` 38→32.
  - `ui.outliner.towers`: `Math.round(rise/1.25 * TOWER_COUNT)` (TOWER_COUNT = number of kind-0 base parts; export it from `cityData.js`).
  - `ui.overlayText`, `ui.viewLabel`, `ui.shading` follow the beat map; `ui.caretOn = Math.floor(t * 2) % 2 === 0`.
- [ ] **Step 3:** `npm run preview`, scrub the whole film; `node --test test/` → PASS.
- [ ] **Step 4: Commit** — `git commit -am "feat: full 15s timeline"`

---

### Task 5: Score and SFX

**Files:**
- Create: `audio/synth.mjs`, `audio/score.mjs`
- Test: `test/beats.test.mjs`

**Interfaces:**
- Consumes: `CUES`, `PROMPTS`, `BPM`, `BEATS`, `BEAT`, `DURATION` from `src/timeline.js`; `mulberry32`.
- Produces: `out/score.wav` (48 kHz, stereo, float32), `beats.json` = `{ bpm: 120, beats: [0, 0.5, …, 14.5] }`, `scheduledHits() → Array<{ time, kind }>` exported from `audio/score.mjs`.

- [ ] **Step 1: Failing beat-sync test**

```js
// test/beats.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { scheduledHits } from '../audio/score.mjs';

test('every hit lands on the beat grid', async () => {
  const { beats } = JSON.parse(await readFile(new URL('../beats.json', import.meta.url)));
  for (const h of scheduledHits()) {
    const nearest = beats.reduce((a, b) => (Math.abs(b - h.time) < Math.abs(a - h.time) ? b : a));
    assert.ok(Math.abs(nearest - h.time) <= 0.001, `${h.kind} at ${h.time}s is off-grid`);
  }
});
```
Run: `node --test test/beats.test.mjs` → FAIL (module missing).

- [ ] **Step 2: `audio/synth.mjs`** — `createBuffer(seconds, sr=48000)` → `{ L: Float32Array, R: Float32Array, sr }`; `addVoice(buf, startSec, fn(tLocal) → [l, r], durSec)`; instruments as pure sample functions: `kick` (sine 110→42 Hz exp sweep, 0.35 s), `hat` (mulberry32 noise → one-pole HP, 40 ms), `click` (bandpassed noise 6 ms, ±3 dB per keystroke via seed), `pop` (sine 880 Hz 30 ms), `thump` (sine 60 Hz + noise 0.25 s), `pluck(freq)` (Karplus-Strong seeded noise, 1.2 s), `pad(freqs)` (3 detuned saws/voice → one-pole LP), `sweep` (noise through resonant LP 200→6000 Hz), `drop` (sine 220→55 Hz 0.6 s), `impact` (kick + noise burst + 2.5 s reverb tail); `reverb(buf, mix)` Schroeder (4 combs + 2 allpasses); `writeWav(path, buf)` float32 WAV.
- [ ] **Step 3: `audio/score.mjs`** — arrangement in A minor: b0 `open` = pad Am (A2 C3 E3) swell + soft kick; b2 `send` = pop; b3 `tool` = hat + click; b4 `delete` = thump, bed (kick every beat, hats on off-beats) starts; b5–b9 `rise` step k = pluck at A3·2^(scale[k]/12) with scale [0, 3, 7, 10, 12]; b11 `send` pop; b12 `night` = drop + sweep, bed switches to half-time; b13–b15 `windows` = high plucks (A5, C6, E6) + hat; b17 `fly` = sweep + full bed with sub bass on A1; b22 typing only; b23 `top` = impact, bed stops; b28 `resolve` = pad F→C→Am(add9) voicing and final kick. Typing clicks at each character time from `PROMPTS` (texture, not hits — not part of `scheduledHits()`). Export `scheduledHits()` mapping every `CUE` to `{ time: beatTime(beat), kind }` plus every bed kick time. Write `beats.json` and `out/score.wav`; soft-clip with `tanh`.
- [ ] **Step 4:** `node audio/score.mjs && node --test test/beats.test.mjs` → PASS. Listen: `afplay out/score.wav`.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: synthesized score and SFX on the beat grid"`

---

### Task 6: Render, contact sheet, verification

**Files:**
- Create: `render.mjs`, `contact.mjs`

**Interfaces:**
- Consumes: `openStage`, `FPS`, `DURATION`, `BEATS`, `beatTime`.

- [ ] **Step 1: `contact.mjs`** — open stage, capture `t = beatTime(b) + 0.25` for b = 0…29 (mid-beat, after the hit lands) into `out/contact/b%02d.png`, then `ffmpeg -y -i out/contact/b%02d.png -vf "scale=480:-1,tile=6x5:padding=8:margin=8:color=0x000000" out/contact.png`.
- [ ] **Step 2: `render.mjs`** — `node audio/score.mjs`; loudnorm pass 1: `ffmpeg -i out/score.wav -af loudnorm=I=-14:TP=-1:LRA=11:print_format=json -f null -` → parse measured values; pass 2 with `measured_I/TP/LRA/thresh/offset` and `linear=true` → `out/score-norm.wav` (48 kHz). Spawn `ffmpeg -y -f image2pipe -framerate 60 -c:v png -i - -i out/score-norm.wav -map 0:v -map 1:a -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p -r 60 -c:a aac -b:a 320k -t 15 -movflags +faststart out/film.mp4`; write each `stage.frame(f / FPS)` PNG for f = 0…899 to stdin, respecting backpressure (`await once(stdin, 'drain')` when `write` returns false); log progress every 60 frames. After exit: `ffprobe -count_frames` must report 900 frames and duration 15.0 ± 0.02; `ffmpeg -i out/film.mp4 -af ebur128=peak=true -f null -` integrated loudness within -14 ± 0.5 LU. Any failure → `process.exit(1)` with the reason.
- [ ] **Step 3:** `node contact.mjs` → open `out/contact.png`. `node render.mjs --frames 120` (support a `--frames N` flag that limits the loop and sets `-t N/60`) → plays in QuickTime with sound.
- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat: contact sheet and verified render pipeline"`

---

### Task 7: Quality loop and final render

- [ ] **Step 1:** `node contact.mjs`, open `out/contact.png`, score 1–10 on: hook in first 2 s, readability at phone size (view the sheet at 480 px wide — that is phone size), motion quality (scrub preview for whips/rises), variety, brand accuracy (compare against `ref/`), sound sync (`render.mjs --frames 360`, watch with sound). Write the scores in the commit message.
- [ ] **Step 2:** Fix the 3 lowest-scoring problems. Re-run tests. Commit.
- [ ] **Step 3:** Repeat Steps 1–2 until every score ≥ 8.
- [ ] **Step 4:** `node render.mjs` → `out/film.mp4` passes its own verification. Watch it once end to end with sound.
- [ ] **Step 5:** Commit — `git commit -am "chore: final render settings"`; tell the user where `out/film.mp4` is (it is git-ignored; it is the deliverable).
