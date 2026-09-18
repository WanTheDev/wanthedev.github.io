import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/WanSou/AppData/Roaming/npm/node_modules/omniroute/node_modules/playwright-core/index.js');

async function main() {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    channel: 'chrome', headless: true,
    args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--disable-web-security', '--no-sandbox'],
  });
  const page = await browser.newPage();
  await page.goto('http://localhost:5199', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof globalThis.asciiPortfolio !== 'undefined', {}, { timeout: 10000 });
  await new Promise(r => setTimeout(r, 1000));

  const viewports = [[1920,1080],[1280,800],[800,600],[320,480],[1600,500]];
  for (const [w,h] of viewports) {
    await page.setViewportSize({ width: w, height: h });
    await new Promise(r => setTimeout(r, 500));
    await page.evaluate(() => {
      globalThis.asciiPortfolio.pause();
      globalThis.asciiPortfolio.render(0);
    });
    await new Promise(r => setTimeout(r, 200));

    const info = await page.evaluate(({w,h}) => {
      const { ascii, scene, camera } = globalThis.asciiPortfolio;
      // Find group
      let group = null;
      scene.traverse(obj => { if (obj.isGroup && obj.children.length >= 2) group = obj; });
      let knot = null, halo = null;
      if (group) {
        group.traverse(obj => {
          if (obj.isMesh && obj.geometry.type === 'TorusKnotGeometry') {
            if (obj.material.flatShading === true) knot = obj;
            else halo = obj;
          }
        });
      }

      // ASCII metrics
      const ctx = ascii.canvas.getContext('2d');
      const aw = ascii.canvas.width, ah = ascii.canvas.height;
      const data = ctx.getImageData(0, 0, aw, ah).data;
      let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
      let litCount=0;
      for (let y = 0; y < ah; y++) {
        for (let x = 0; x < aw; x++) {
          const i = (y*aw+x)*4;
          const lum = data[i]*0.2126 + data[i+1]*0.7152 + data[i+2]*0.0722;
          if (lum > 60) {
            litCount++;
            if(x<minX)minX=x; if(x>maxX)maxX=x;
            if(y<minY)minY=y; if(y>maxY)maxY=y;
          }
        }
      }
      const cmCx = litCount > 0 ? (minX+maxX)/2/aw : 0.5;
      const cmCy = litCount > 0 ? (minY+maxY)/2/ah : 0.5;

      return {
        viewport: [w, h],
        asciiCssW: parseInt(ascii.canvas.style.width),
        asciiCssH: parseInt(ascii.canvas.style.height),
        asciiBufW: aw,
        asciiBufH: ah,
        columns: ascii.columns,
        rows: ascii.rows,
        dpr: ascii.devicePixelRatio,
        cmCenter: { cx: cmCx.toFixed(4), cy: cmCy.toFixed(4) },
        cameraAspect: camera.aspect.toFixed(4),
        framingDist: Math.sqrt(camera.position.x**2 + camera.position.y**2 + camera.position.z**2).toFixed(4),
      };
    }, {w, h});
    console.log(JSON.stringify(info, null, 2));
  }

  await browser.close();
}

main().catch(err => { console.error(err); process.exit(1); });
