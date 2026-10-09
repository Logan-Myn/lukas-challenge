// The only place requestAnimationFrame is allowed.
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
