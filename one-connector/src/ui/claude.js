import { icon } from './icons.js';
import { CLAUDE_WIN } from './layout.js';

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

export function createClaudeUI(root) {
  const win = document.createElement('div');
  win.className = 'win claude';
  Object.assign(win.style, { left: `${CLAUDE_WIN.x}px`, top: `${CLAUDE_WIN.y}px`, width: `${CLAUDE_WIN.w}px`, height: `${CLAUDE_WIN.h}px` });
  win.innerHTML = `
    <div class="c-title"><i></i><i></i><i></i></div>
    <div class="c-head"><img class="c-spark" src="/assets/claude-spark.svg" alt=""><span>Claude</span>
      <span class="c-conn"><img src="/assets/blender-logo.svg" alt="">Blender</span></div>
    <div class="c-scroll"><div class="c-thread"></div></div>
    <div class="c-input"><div class="c-draft"></div>
      <div class="c-input-row"><span class="c-plus">${icon.plus}</span><span class="c-tools">${icon.plug} Blender</span><span class="c-send">${icon.send}</span></div></div>`;
  root.append(win);

  const thread = win.querySelector('.c-thread'), draft = win.querySelector('.c-draft'), scroll = win.querySelector('.c-scroll');
  let lastThread = '';

  return {
    update(ui) {
      const html = ui.chat.map(m => (m.role === 'user'
        ? `<div class="c-user">${esc(m.text)}</div>`
        : `<div class="c-claude"><img class="c-avatar" src="/assets/claude-spark.svg" alt="">
             <div class="c-tool"><div class="c-tool-head"><img src="/assets/blender-logo.svg" alt="">Blender
               <span class="c-tool-state">${m.done ? icon.check : '<i class="c-dot"></i>'}</span></div>
               <pre class="c-code">${m.code.slice(0, m.lines).map(l => `<div>${esc(l)}</div>`).join('')}</pre></div></div>`)).join('');
      if (html !== lastThread) { thread.innerHTML = html; lastThread = html; }
      // newest message sits just above the input box
      const overflow = Math.max(0, thread.scrollHeight - scroll.clientHeight);
      thread.style.transform = `translateY(${-overflow}px)`;
      const typed = ui.draft.text.slice(0, ui.draft.shown);
      draft.innerHTML = typed ? `${esc(typed)}<span class="c-caret${ui.caretOn ? '' : ' off'}"></span>`
        : `<span class="c-placeholder">Reply to Claude…</span>`;
      win.querySelector('.c-send').classList.toggle('ready', typed.length > 0);
    },
  };
}
