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
    let h = (0.2 + 4.2 * (1 - d) ** 3.2) * (0.5 + 0.9 * hash01(id, 1) ** 1.6);
    if (hash01(id, 12) < 0.06) h *= 1.6;             // mid-rise spikes along the rays
    const landmark = hash01(id, 2) < 0.035 && d < 0.5;
    if (landmark) h = Math.min(h * 1.6, 6.2);
    const slim = h > 2 ? 0.86 : 1;
    const w = (0.30 + 0.06 * hash01(id, 3)) * slim, dp = (0.30 + 0.06 * hash01(id, 4)) * slim;
    const seed = hash01(id, 5);
    let y = 0;
    if (h > 0.8) { parts.push({ x, z, y0: 0, h: 0.1, w: 0.4, d: 0.4, kind: 1, seed, ring }); y = 0.1; }
    const tiers = h > 1.8 ? 3 : h > 0.8 ? 2 : 1;
    const split = tiers === 3 ? [0.56, 0.3, 0.14] : tiers === 2 ? [0.72, 0.28] : [1];
    const shrink = [1, 0.8 - 0.06 * hash01(id, 6), 0.6 - 0.06 * hash01(id, 7)];
    const ox = (hash01(id, 8) - 0.5) * 0.03, oz = (hash01(id, 9) - 0.5) * 0.03;
    const h0 = y;
    for (let i = 0; i < tiers; i++) {
      const th = (h - h0) * split[i];
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
      const n = Math.floor(hash01(bid, 100) * 3);
      for (let k = 0; k < n; k++) trees.push({ x: cx + (hash01(bid, 110 + k) - 0.5) * 0.7, z: cz + (hash01(bid, 120 + k) - 0.5) * 0.7,
                                              s: 0.6 + 0.6 * hash01(bid, 130 + k) });
    }
  }
  for (const p of [...parts, ...tanks, ...lights]) p.ring /= maxRing;
  return { parts, tanks, trees, lights, cars, maxRing, blockHas, blocks: LOTS / 2 };
}
