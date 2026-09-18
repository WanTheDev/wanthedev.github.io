import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/WanSou/AppData/Roaming/npm/node_modules/omniroute/node_modules/playwright-core/index.js');
import { writeFileSync } from 'fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL_ = 'http://localhost:5199';
const browser = await chromium.launch({ executablePath: CHROME, args: ['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--disable-web-security','--no-sandbox'], headless: true });

async function readState(label, viewport, storm) {
  const page = await browser.newPage();
  const warnings = [];
  page.on('console', m => { if (/GL_INVALID_VALUE|glCopySubTexture/.test(m.text())) warnings.push({ ts: Date.now() }); });
  await page.setViewportSize(viewport);
  await page.goto(URL_, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForFunction(() => typeof globalThis.asciiPortfolio !== 'undefined', { timeout: 10000 });
  await page.waitForTimeout(600);
  if (storm) {
    let w = 1280;
    for (let i = 0; i < 30; i++) { w = i % 2 === 0 ? Math.max(700, w - 60) : Math.min(1280, w + 60); await page.setViewportSize({ width: w, height: 800 }); await page.waitForTimeout(80); }
    await page.waitForTimeout(2500);
  } else {
    await page.waitForTimeout(3000);
  }
  const st = await page.evaluate(() => {
    const { ascii, composite, camera, renderer, fx } = globalThis.asciiPortfolio;
    const db = new (window.THREE_VECTOR2 || function(){this.x=0;this.y=0;this.set=function(a,b){this.x=a;this.y=b;return this;};this.copy=function(v){this.x=v.x;this.y=v.y;return this;};})();
    renderer.getDrawingBufferSize(db);
    return {
      bloomRendererPixelRatio: composite.bloom.renderer.getPixelRatio ? null : null,
      compositeRendererPixelRatio: composite.renderer.getPixelRatio(),
      sceneRendererPixelRatio: renderer.getPixelRatio(),
      cameraAspect: camera.aspect,
      fxComposerReadBuffer: [fx.composer.readBuffer.width, fx.composer.readBuffer.height],
      compositeComposerReadBuffer: [composite.composer.readBuffer.width, composite.composer.readBuffer.height],
      rendererDrawingBufferSize: [db.x, db.y],
      sceneRendererDomElement: [renderer.domElement.width, renderer.domElement.height],
      compositeRendererDomElement: [composite.renderer.domElement.width, composite.renderer.domElement.height],
      bloomCompositePassTargets: composite.bloom.renderTargetsHorizontal.map(rt => [rt.width, rt.height]),
      bloomCompositeBrightTarget: [composite.bloom.renderTargetBright.width, composite.bloom.renderTargetBright.height],
      asciiCanvas: [ascii.canvas.width, ascii.canvas.height],
      asciiGrid: [ascii.columns, ascii.rows],
      inner: [window.innerWidth, window.innerHeight],
      dpr: window.devicePixelRatio,
    };
  });
  await page.close();
  return { label, warnings: warnings.length, state: st };
}

const s1 = await readState('S1-1920x1080', { width: 1920, height: 1080 }, false);
const s3 = await readState('S3-after-storm', { width: 1280, height: 800 }, true);
await browser.close();
writeFileSync('.shots/gl-state-read.json', JSON.stringify({ S1: s1, S3: s3 }, null, 2));
console.log(JSON.stringify({ S1: s1, S3: s3 }, null, 2));
