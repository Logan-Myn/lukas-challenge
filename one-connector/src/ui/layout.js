// Stage geometry shared by the UI builders and the motion camera (stage px, 1920×1080).
export const STAGE = { w: 1920, h: 1080 };

// Inside the Blender window
export const B_TOPBAR = 34, B_HEADER = 34, B_TIMELINE = 64, B_STATUS = 26, B_SIDE = 300;
const B_W = 1200;
export const VIEWPORT = { x: 0, y: B_TOPBAR + B_HEADER, w: B_W - B_SIDE, h: Math.round((B_W - B_SIDE) * 9 / 16) };

export const WIN_H = B_TOPBAR + B_HEADER + VIEWPORT.h + B_TIMELINE + B_STATUS;
export const WIN_TOP = Math.round((STAGE.h - WIN_H) / 2);
export const CLAUDE_WIN = { x: 64, y: WIN_TOP, w: 560, h: WIN_H };
export const BLENDER_WIN = { x: 656, y: WIN_TOP, w: B_W, h: WIN_H };

// Stage-space rects the motion camera frames
const vpStage = { x: BLENDER_WIN.x + VIEWPORT.x, y: BLENDER_WIN.y + VIEWPORT.y, w: VIEWPORT.w, h: VIEWPORT.h };
export const FOCUS = {
  overview: { cx: 960, cy: 540, s: 1 },
  chat: { cx: CLAUDE_WIN.x + CLAUDE_WIN.w / 2 + 20, cy: CLAUDE_WIN.y + CLAUDE_WIN.h - 250, s: 1.85 },
  viewport: { cx: vpStage.x + vpStage.w / 2 + 70, cy: vpStage.y + vpStage.h / 2, s: 1.3 },
  outliner: { cx: BLENDER_WIN.x + BLENDER_WIN.w - B_SIDE / 2 - 60, cy: BLENDER_WIN.y + B_TOPBAR + 120, s: 2.1 },
  full: { cx: vpStage.x + vpStage.w / 2, cy: vpStage.y + vpStage.h / 2, s: STAGE.w / VIEWPORT.w },
};
