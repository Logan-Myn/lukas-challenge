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
