// node render.mjs [--frames N]  →  out/film.mp4 (verified: frame count, duration, loudness)
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { openStage } from './tools/stage.mjs';
import { writeScore } from './audio/score.mjs';
import { FPS, DURATION } from './src/timeline.js';

const argv = process.argv.slice(2);
const frames = argv.includes('--frames') ? Number(argv[argv.indexOf('--frames') + 1]) : Math.round(DURATION * FPS);
const seconds = frames / FPS;
const die = msg => { console.error(`render failed: ${msg}`); process.exit(1); };
const ff = args => {
  const r = spawnSync('ffmpeg', ['-hide_banner', ...args], { encoding: 'utf8' });
  if (r.status !== 0) die(r.stderr.slice(-800));
  return r.stderr;
};
const lastJson = s => JSON.parse(s.slice(s.lastIndexOf('{'), s.lastIndexOf('}') + 1));

// 1. score → two-pass loudnorm to -14 LUFS integrated, -1 dBTP
await writeScore();
const LN = 'loudnorm=I=-14:TP=-1:LRA=11';
const m = lastJson(ff(['-i', 'out/score.wav', '-af', `${LN}:print_format=json`, '-f', 'null', '-']));
ff(['-y', '-i', 'out/score.wav', '-af',
  `${LN}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`,
  '-ar', '48000', 'out/score-norm.wav']);

// 2. frames → ffmpeg
const enc = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
  '-i', 'out/score-norm.wav', '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p',
  '-r', String(FPS), '-c:a', 'aac', '-b:a', '320k', '-t', String(seconds), '-movflags', '+faststart', 'out/film.mp4'],
  { stdio: ['pipe', 'inherit', 'inherit'] });
const stage = await openStage();
const started = Date.now();
try {
  for (let f = 0; f < frames; f++) {
    const png = await stage.frame(f / FPS);
    if (!enc.stdin.write(png)) await once(enc.stdin, 'drain');
    if (f % 60 === 59) console.log(`frame ${f + 1}/${frames}  (${((Date.now() - started) / 1000).toFixed(0)}s)`);
  }
} finally { await stage.close(); }
enc.stdin.end();
const [code] = await once(enc, 'close');
if (code !== 0) die(`ffmpeg exited ${code}`);

// 3. verify
const probe = spawnSync('ffprobe', ['-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames:format=duration',
  '-of', 'json', 'out/film.mp4'], { encoding: 'utf8' });
const info = JSON.parse(probe.stdout);
const got = Number(info.streams[0].nb_read_frames), dur = Number(info.format.duration);
if (got !== frames) die(`expected ${frames} frames, got ${got}`);
if (Math.abs(dur - seconds) > 0.05) die(`expected ${seconds}s, got ${dur}s`);
const ebu = ff(['-i', 'out/film.mp4', '-map', '0:a', '-af', 'ebur128=peak=true', '-f', 'null', '-']);
const lufs = Number(ebu.match(/I:\s+(-?[\d.]+) LUFS/g).pop().match(/-?[\d.]+/)[0]);
if (frames === Math.round(DURATION * FPS) && Math.abs(lufs + 14) > 0.5) die(`loudness ${lufs} LUFS, expected -14 ±0.5`);
console.log(`out/film.mp4  ${got} frames, ${dur.toFixed(2)}s, ${lufs} LUFS`);
