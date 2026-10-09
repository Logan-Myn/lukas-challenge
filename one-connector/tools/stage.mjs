import puppeteer from 'puppeteer-core';
import { startServer } from './serve.mjs';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export const W = 1920, H = 1080;

export async function openStage(query = '') {
  const server = await startServer();
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--force-device-scale-factor=1',
           '--hide-scrollbars', '--mute-audio', '--font-render-hinting=none'],
    defaultViewport: { width: W, height: H, deviceScaleFactor: 1 },
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e));
  page.on('console', m => { if (m.type() === 'error') errors.push(new Error(m.text())); });
  const fail = async e => { await browser.close(); server.close(); throw e; };
  await page.goto(`${server.url}/index.html?render${query ? '&' + query : ''}`, { waitUntil: 'load' });
  try { await page.evaluate(() => window.ready); } catch (e) { await fail(e); }
  if (errors.length) await fail(errors[0]);
  const cdp = await page.createCDPSession();
  return {
    page,
    async frame(t) {
      await page.evaluate(t => window.seek(t), t);
      const { data } = await cdp.send('Page.captureScreenshot', {
        format: 'png', clip: { x: 0, y: 0, width: W, height: H, scale: 1 },
      });
      if (errors.length) throw errors[0];
      return Buffer.from(data, 'base64');
    },
    async close() { await browser.close(); server.close(); },
  };
}
