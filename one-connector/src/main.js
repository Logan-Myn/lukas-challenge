import { DURATION } from './timeline.js';
import { stateAt } from './state.js';
import { createViewport } from './scene/viewport.js';

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
    document.fonts.load('400 20px "Instrument Serif"'),
  ]);
  const viewport = await createViewport(document.getElementById('gl'), params);
  apply = s => viewport.update(s);
  window.seek(0);
})();

if (params.has('preview')) {
  await window.ready;
  const { mountPreview } = await import('./preview.js');
  mountPreview(window.seek, DURATION);
}
