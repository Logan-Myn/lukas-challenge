// One frame per beat (mid-beat, after the hit lands) → out/contact.png
import { writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { openStage } from './tools/stage.mjs';
import { BEATS, beatTime } from './src/timeline.js';

await mkdir('out/contact', { recursive: true });
const stage = await openStage();
try {
  for (let b = 0; b < BEATS; b++) {
    await writeFile(`out/contact/b${String(b).padStart(2, '0')}.png`, await stage.frame(beatTime(b) + 0.25));
  }
} finally { await stage.close(); }
execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', 'out/contact/b%02d.png', '-vf',
  'scale=480:-1,tile=6x5:padding=8:margin=8:color=0x000000', '-frames:v', '1', 'out/contact.png']);
console.log('out/contact.png');
