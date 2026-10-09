import { STAGE } from './layout.js';
import { ease } from '../timeline.js';

// Motion camera over the whole UI + end card. ui.focus = { cx, cy, s, rotY } in stage px.
export function createFraming(stage, world) {
  const dim = document.createElement('div');
  dim.className = 'dim';
  const card = document.createElement('div');
  card.className = 'endcard';
  card.innerHTML = `<div class="ec-title">One connector.</div>
    <div class="ec-lockup"><img class="ec-spark" src="/assets/claude-spark.svg" alt=""><span class="ec-name">Claude</span>
    <span class="ec-x">×</span><img class="ec-blender" src="/assets/blender-logo.svg" alt=""><span class="ec-name">Blender</span></div>`;
  stage.append(dim, card);
  const title = card.querySelector('.ec-title'), lockup = card.querySelector('.ec-lockup');

  return {
    update(ui) {
      const { cx, cy, s, rotY } = ui.focus;
      world.style.transform =
        `translate(${STAGE.w / 2}px, ${STAGE.h / 2}px) rotateY(${rotY}deg) scale(${s}) translate(${-cx}px, ${-cy}px)`;
      const e = ui.endCard;
      dim.style.opacity = String(0.6 * e);
      const k1 = ease.outExpo(Math.min(1, e * 1.4)), k2 = ease.outExpo(Math.max(0, e * 1.4 - 0.4));
      title.style.transform = `translateY(${(1 - k1) * 60}px)`;
      title.style.clipPath = `inset(0 0 ${(1 - k1) * 100}% 0)`;
      lockup.style.transform = `translateY(${(1 - k2) * 40}px)`;
      lockup.style.clipPath = `inset(0 0 ${(1 - k2) * 100}% 0)`;
      card.style.visibility = e > 0 ? 'visible' : 'hidden';
    },
  };
}
