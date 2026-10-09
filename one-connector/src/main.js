import { DURATION } from './timeline.js';
import { stateAt, CITY } from './state.js';
import { createViewport } from './scene/viewport.js';
import { createBlenderUI } from './ui/blender.js';
import { createClaudeUI } from './ui/claude.js';
import { createFraming } from './ui/framing.js';

const params = new URLSearchParams(location.search);
const clampT = t => {
  const n = Number(t);
  return Number.isFinite(n) ? Math.min(Math.max(n, 0), DURATION - 1e-6) : 0;
};

let apply = null;
window.seek = t => {
  if (!apply) throw new Error('seek() called before window.ready resolved');
  apply(stateAt(clampT(t)));
};

window.ready = (async () => {
  await Promise.all([
    document.fonts.load('400 20px "Geist Sans"'), document.fonts.load('400 20px "Geist Mono"'),
    document.fonts.load('400 20px "Instrument Serif"'), document.fonts.load('500 20px "Geist Sans"'),
    document.fonts.load('600 20px "Geist Sans"'),
  ]);
  const stage = document.getElementById('stage'), world = document.getElementById('world');
  const claude = createClaudeUI(world);
  const blender = createBlenderUI(world);
  const gl = document.getElementById('gl');
  blender.viewportEl.prepend(gl);
  const framing = createFraming(stage, world);
  const viewport = await createViewport(gl, params);
  CITY.towers = viewport.towerCount;
  await Promise.all([...document.images].map(img => img.decode()));
  apply = s => { blender.update(s.ui); claude.update(s.ui); framing.update(s.ui); viewport.update(s); };
  window.seek(0);
})();

if (params.has('preview')) {
  await window.ready;
  const { mountPreview } = await import('./preview.js');
  mountPreview(window.seek, DURATION);
}
