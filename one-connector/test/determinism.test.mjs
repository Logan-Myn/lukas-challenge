import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openStage } from '../tools/stage.mjs';

// Largest per-pixel difference (0-255) between two PNGs. Chrome keeps a higher-resolution raster of
// scaled DOM text after zooming out, so revisits can differ by 1-2 levels of antialiasing — invisible.
const dir = mkdtempSync(join(tmpdir(), 'det-'));
let n = 0;
function maxDiff(a, b) {
  const pa = join(dir, `${n}a.png`), pb = join(dir, `${n++}b.png`);
  writeFileSync(pa, a); writeFileSync(pb, b);
  const r = spawnSync('ffmpeg', ['-hide_banner', '-i', pa, '-i', pb, '-lavfi',
    'blend=all_mode=difference,format=gray,signalstats,metadata=print:key=lavfi.signalstats.YMAX', '-f', 'null', '-'], { encoding: 'utf8' });
  return Number(r.stderr.match(/YMAX=(\d+)/)[1]);
}
const SAME = 2;

test('seek(t) is a pure function of t', { timeout: 180_000 }, async () => {
  const stage = await openStage();
  try {
    const times = [0, 1.25, 3.2, 6.6, 9.6, 12.4, 14.9];
    const first = new Map();
    for (const t of times) first.set(t, await stage.frame(t));
    for (const t of [...times].reverse()) {
      const d = maxDiff(await stage.frame(t), first.get(t));
      assert.ok(d <= SAME, `frame at t=${t} differs on revisit by ${d}/255`);
    }
  } finally { await stage.close(); }
});

test('seek clamps bad input instead of throwing', { timeout: 120_000 }, async () => {
  const stage = await openStage();
  try {
    const zero = await stage.frame(0);
    for (const bad of [-3, Number.NaN, '0']) assert.ok(maxDiff(await stage.frame(bad), zero) <= SAME, `seek(${bad}) != seek(0)`);
    const end = await stage.frame(15);
    assert.ok(maxDiff(await stage.frame(99), end) <= SAME, 'seek(99) != seek(15)');
  } finally { await stage.close(); }
});
