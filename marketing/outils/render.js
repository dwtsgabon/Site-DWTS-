// node render.js <html> <out.png> <w> <h>            -> image
// node render.js <html> <framesDir> <w> <h> <secs>   -> frames at 30 fps
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const [html, out, w, h, secs] = process.argv.slice(2);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: +w, height: +h } });
  await page.goto('file://' + path.resolve(html));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  if (!secs) {
    await page.screenshot({ path: out });
  } else {
    const fps = 30, n = Math.round(+secs * fps);
    await page.evaluate(() => document.getAnimations().forEach(a => a.pause()));
    for (let i = 0; i < n; i++) {
      await page.evaluate(t => document.getAnimations().forEach(a => (a.currentTime = t)), (i * 1000) / fps);
      await page.screenshot({ path: `${out}/f${String(i).padStart(4, '0')}.png` });
    }
  }
  await browser.close();
})();
