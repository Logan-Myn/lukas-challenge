import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { openStage } from '../tools/stage.mjs';

const sha = b => createHash('sha256').update(b).digest('hex');

test('seek(t) is a pure function of t', { timeout: 180_000 }, async () => {
  const stage = await openStage();
  try {
    const times = [0, 1.25, 3.2, 6.6, 9.6, 12.4, 14.9];
    const first = new Map();
    for (const t of times) first.set(t, sha(await stage.frame(t)));
    for (const t of [...times].reverse()) {
      assert.equal(sha(await stage.frame(t)), first.get(t), `frame at t=${t} differs on revisit`);
    }
  } finally { await stage.close(); }
});

test('seek clamps bad input instead of throwing', { timeout: 120_000 }, async () => {
  const stage = await openStage();
  try {
    const zero = sha(await stage.frame(0));
    assert.equal(sha(await stage.frame(-3)), zero);
    assert.equal(sha(await stage.frame(Number.NaN)), zero);
    assert.equal(sha(await stage.frame('0')), zero);
    const end = sha(await stage.frame(15));
    assert.equal(sha(await stage.frame(99)), end);
  } finally { await stage.close(); }
});
