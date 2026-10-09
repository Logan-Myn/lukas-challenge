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
