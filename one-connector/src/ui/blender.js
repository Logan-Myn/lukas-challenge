import { icon, shadingIcon } from './icons.js';
import { BLENDER_WIN, VIEWPORT, B_TOPBAR, B_HEADER, B_TIMELINE, B_STATUS, B_SIDE } from './layout.js';

const TABS = ['Layout', 'Modeling', 'Sculpting', 'UV Editing', 'Texture Paint', 'Shading', 'Animation'];
const TOOLS = ['select', 'cursor', 'move', 'rotate', 'scale', 'annotate', 'measure', 'addCube'];
const OUTLINER_ROWS = 7;

export function createBlenderUI(root) {
  const win = document.createElement('div');
  win.className = 'win blender';
  Object.assign(win.style, { left: `${BLENDER_WIN.x}px`, top: `${BLENDER_WIN.y}px`, width: `${BLENDER_WIN.w}px`, height: `${BLENDER_WIN.h}px` });
  win.innerHTML = `
    <div class="b-top" style="height:${B_TOPBAR}px">
      <img class="b-logo" src="/assets/blender-logo.svg" alt="">
      ${['File', 'Edit', 'Render', 'Window', 'Help'].map(m => `<span class="b-menu">${m}</span>`).join('')}
      <div class="b-tabs">${TABS.map((t, i) => `<span class="b-tab${i === 0 ? ' on' : ''}">${t}</span>`).join('')}</div>
      <span class="b-scene">${icon.collection} Scene</span>
    </div>
    <div class="b-header" style="top:${B_TOPBAR}px;height:${B_HEADER}px;width:${VIEWPORT.w}px">
      <span class="b-drop">Object Mode ${icon.chevronDown}</span>
      ${['View', 'Select', 'Add', 'Object'].map(m => `<span class="b-menu">${m}</span>`).join('')}
      <span class="b-drop b-global">Global ${icon.chevronDown}</span>
      <div class="b-shading">
        ${['wire', 'solid', 'material', 'rendered'].map(k => `<span class="b-shade" data-k="${k}">${shadingIcon(k)}</span>`).join('')}
      </div>
    </div>
    <div class="b-viewport" style="top:${VIEWPORT.y}px;width:${VIEWPORT.w}px;height:${VIEWPORT.h}px">
      <div class="b-overlay">
        <div class="b-overlay-text"><div class="b-view-label"></div><div class="b-active"></div></div>
        <div class="b-toolbar">${TOOLS.map((t, i) => `<span class="b-tool${i === 0 ? ' on' : ''}">${icon[t]}</span>`).join('')}</div>
        <svg class="b-gizmo" width="96" height="96" viewBox="0 0 96 96">
          <line x1="48" y1="48" x2="78" y2="62" stroke="#C2454F" stroke-width="2.5"/>
          <line x1="48" y1="48" x2="70" y2="26" stroke="#7FA33A" stroke-width="2.5"/>
          <line x1="48" y1="48" x2="48" y2="12" stroke="#5B79A8" stroke-width="2.5"/>
          <circle cx="20" cy="36" r="7" fill="#5f2a2f"/><circle cx="28" cy="72" r="7" fill="#3f5124"/><circle cx="48" cy="84" r="7" fill="#2f3c52"/>
          <circle cx="78" cy="62" r="9" fill="#C2454F"/><text x="78" y="66" text-anchor="middle">X</text>
          <circle cx="70" cy="26" r="9" fill="#7FA33A"/><text x="70" y="30" text-anchor="middle">Y</text>
          <circle cx="48" cy="12" r="9" fill="#5B79A8"/><text x="48" y="16" text-anchor="middle">Z</text>
        </svg>
        <div class="b-navs"><span>${icon.zoom}</span><span>${icon.hand}</span><span>${icon.camera}</span><span>${icon.grid}</span></div>
      </div>
      <div class="b-passepartout"></div>
    </div>
    <div class="b-side" style="top:${B_TOPBAR}px;width:${B_SIDE}px">
      <div class="b-outliner">
        <div class="b-out-head">${icon.collection}<span>Scene Collection</span><span class="b-count"></span></div>
        <div class="b-out-rows"></div>
      </div>
      <div class="b-props">
        <div class="b-props-tabs">${Array.from({ length: 9 }, () => '<i></i>').join('')}</div>
        <div class="b-props-body">
          <div class="b-props-name">${icon.cube}<span class="b-props-obj"></span></div>
          <div class="b-panel"><div class="b-panel-head">${icon.chevronDown} Transform</div>
            ${['Location X', 'Y', 'Z'].map(l => `<div class="b-field"><label>${l}</label><span class="b-num">0 m</span></div>`).join('')}
            ${['Rotation X', 'Y', 'Z'].map(l => `<div class="b-field"><label>${l}</label><span class="b-num">0°</span></div>`).join('')}
            ${['Scale X', 'Y', 'Z'].map(l => `<div class="b-field"><label>${l}</label><span class="b-num">1.000</span></div>`).join('')}
          </div>
          ${['Delta Transform', 'Relations', 'Collections'].map(p => `<div class="b-panel closed">${icon.chevronRight} ${p}</div>`).join('')}
        </div>
      </div>
    </div>
    <div class="b-timeline" style="height:${B_TIMELINE}px;bottom:${B_STATUS}px;width:${VIEWPORT.w}px">
      <div class="b-tl-head">${['View', 'Marker'].map(m => `<span class="b-menu">${m}</span>`).join('')}<span class="b-drop">Playback ${icon.chevronDown}</span>
        <span class="b-transport">${icon.play}</span><span class="b-frame">1</span><span class="b-range">Start 1 &nbsp; End 250</span></div>
      <div class="b-ruler">${[1, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200].map(n => `<span>${n}</span>`).join('')}</div>
    </div>
    <div class="b-status" style="height:${B_STATUS}px"><span>5.0.0</span></div>`;
  root.append(win);

  const $ = s => win.querySelector(s);
  const viewportEl = $('.b-viewport');
  const label = $('.b-view-label'), active = $('.b-active'), rows = $('.b-out-rows'), count = $('.b-count');
  const shades = [...win.querySelectorAll('.b-shade')];
  const overlay = $('.b-overlay'), passe = $('.b-passepartout'), propsObj = $('.b-props-obj');
  let lastRows = '';

  return {
    viewportEl,
    update(ui) {
      label.textContent = ui.viewLabel;
      active.textContent = `(1) Collection | ${ui.activeName}`;
      propsObj.textContent = ui.activeName;
      shades.forEach(s => s.classList.toggle('on', s.dataset.k === ui.shading));
      shades.forEach(s => s.classList.toggle('accent', s.dataset.k === ui.shading && ui.shading === 'rendered'));
      overlay.style.opacity = ui.overlays === 'none' ? '0' : '1';
      overlay.classList.toggle('label-only', ui.overlays === 'label');
      passe.style.opacity = String(ui.passepartout);
      const o = ui.outliner;
      const list = [['Camera', 'camera'], ...(o.cube ? [['Cube', 'cube']] : []), ['Light', 'light']];
      for (let i = Math.max(1, o.towers - (OUTLINER_ROWS - list.length) + 1); i <= o.towers; i++) list.push([`Tower.${String(i).padStart(3, '0')}`, 'cube']);
      const html = `<div class="b-row b-coll">${icon.chevronDown}${icon.collection}<span>Collection</span></div>` +
        list.map(([n, k]) =>
          `<div class="b-row${n === ui.activeName ? ' active' : ''}">${icon.chevronRight}${icon[k]}<span>${n}</span><b>${icon.eye}${icon.camera}</b></div>`).join('');
      if (html !== lastRows) { rows.innerHTML = html; lastRows = html; }
      count.textContent = o.towers ? `${o.towers + 2 + (o.cube ? 1 : 0)} objects` : '';
    },
  };
}
