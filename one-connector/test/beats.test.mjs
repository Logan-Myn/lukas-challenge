import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { scheduledHits } from '../audio/score.mjs';

test('every hit lands on the beat grid', async () => {
  const { beats } = JSON.parse(await readFile(new URL('../beats.json', import.meta.url)));
  for (const h of scheduledHits()) {
    const nearest = beats.reduce((a, b) => (Math.abs(b - h.time) < Math.abs(a - h.time) ? b : a));
    assert.ok(Math.abs(nearest - h.time) <= 0.001, `${h.kind} at ${h.time}s is off-grid`);
  }
});
