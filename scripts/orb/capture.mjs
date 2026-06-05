// 시스템 Chrome(puppeteer-core)으로 orb를 투명 배경 프레임(PNG)으로 캡처.
// 사용: node scripts/orb/capture.mjs [size] [state] [frames] [dt]
import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const SIZE = Number(process.argv[2] || 512);
const STATE = process.argv[3] || 'thinking';
const FRAMES = Number(process.argv[4] || 150);   // 30fps * 5s
const DT = Number(process.argv[5] || 0.032);     // 실시간 속도(60fps*0.016 → 30fps 환산)
const LW = process.argv[6] || '0.04';            // 선 굵기 비율(클수록 굵음)

const htmlUrl = 'file://' + path.join(__dirname, 'capture.html') + `?size=${SIZE}&state=${STATE}&lw=${LW}`;
const outDir = path.join(__dirname, 'frames');

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--force-color-profile=srgb'],
});
const page = await browser.newPage();
await page.setViewport({ width: SIZE, height: SIZE, deviceScaleFactor: 2 });
await page.goto(htmlUrl, { waitUntil: 'load' });
await page.waitForFunction('window.__ready === true', { timeout: 10000 });

const el = await page.$('#orb');
for (let i = 0; i < FRAMES; i++) {
  const t = i * DT;
  await page.evaluate((tt) => window.__drawOrb(tt), t);
  const name = 'frame_' + String(i).padStart(4, '0') + '.png';
  await el.screenshot({ path: path.join(outDir, name), omitBackground: true });
  if (i % 30 === 0) console.log(`frame ${i}/${FRAMES}`);
}
console.log(`done: ${FRAMES} frames @ ${SIZE}px (${STATE}) → ${outDir}`);
await browser.close();
