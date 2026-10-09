// node tools/still.mjs --look night | --t 7.5   [--out path]
import { writeFile, mkdir } from 'node:fs/promises';
import { openStage } from './stage.mjs';

const argv = process.argv.slice(2);
const args = Object.fromEntries(argv.flatMap((a, i) => (a.startsWith('--') ? [[a.slice(2), argv[i + 1]]] : [])));
const stage = await openStage(args.look ? `look=${args.look}` : '');
try {
  const png = await stage.frame(Number(args.t ?? 0));
  await mkdir('out', { recursive: true });
  const out = args.out ?? `out/${args.look ? 'lookdev-' + args.look : 't' + args.t}.png`;
  await writeFile(out, png);
  console.log(out);
} finally { await stage.close(); }
