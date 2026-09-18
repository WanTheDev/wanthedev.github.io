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

  const geo = await page.evaluate(() => {
    const { scene } = globalThis.asciiPortfolio;
    let knotMesh = null, haloMesh = null;
    scene.traverse((obj) => {
      if (obj.isMesh && obj.geometry.type === 'TorusKnotGeometry') {
        if (obj.material.flatShading === true) knotMesh = obj;
        else haloMesh = obj;
      }
    });

    function analyzeMesh(mesh, name) {
      mesh.updateMatrixWorld();
      const pos = mesh.geometry.attributes.position;
      let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,minZ=Infinity,maxZ=-Infinity;
      let sumX=0,sumY=0,sumZ=0;
      for (let i=0;i<pos.count;i++){
        const x=pos.getX(i), y=pos.getY(i), z=pos.getZ(i);
        const mw = mesh.matrixWorld.elements;
        const wx = mw[0]*x + mw[4]*y + mw[8]*z + mw[12];
        const wy = mw[1]*x + mw[5]*y + mw[9]*z + mw[13];
        const wz = mw[2]*x + mw[6]*y + mw[10]*z + mw[14];
        if(wx<minX)minX=wx; if(wx>maxX)maxX=wx;
        if(wy<minY)minY=wy; if(wy>maxY)maxY=wy;
        if(wz<minZ)minZ=wz; if(wz>maxZ)maxZ=wz;
        sumX+=wx; sumY+=wy; sumZ+=wz;
      }
      return {
        name,
        bboxCenter: [(minX+maxX)/2, (minY+maxY)/2, (minZ+maxZ)/2],
        vertexMean: [sumX/pos.count, sumY/pos.count, sumZ/pos.count],
      };
    }

    const knot = knotMesh ? analyzeMesh(knotMesh, 'knot') : null;
    const halo = haloMesh ? analyzeMesh(haloMesh, 'halo') : null;

    let unionMin = [Infinity, Infinity, Infinity];
    let unionMax = [-Infinity, -Infinity, -Infinity];
    for (const m of [knotMesh, haloMesh].filter(Boolean)) {
      m.updateMatrixWorld();
      const pos = m.geometry.attributes.position;
      const mw = m.matrixWorld.elements;
      for (let i=0;i<pos.count;i++){
        const x=pos.getX(i), y=pos.getY(i), z=pos.getZ(i);
        const wx = mw[0]*x + mw[4]*y + mw[8]*z + mw[12];
        const wy = mw[1]*x + mw[5]*y + mw[9]*z + mw[13];
        const wz = mw[2]*x + mw[6]*y + mw[10]*z + mw[14];
        if(wx<unionMin[0])unionMin[0]=wx; if(wx>unionMax[0])unionMax[0]=wx;
        if(wy<unionMin[1])unionMin[1]=wy; if(wy>unionMax[1])unionMax[1]=wy;
        if(wz<unionMin[2])unionMin[2]=wz; if(wz>unionMax[2])unionMax[2]=wz;
      }
    }

    return {
      knot, halo,
      unionWorldBbox: {
        center: [(unionMin[0]+unionMax[0])/2, (unionMin[1]+unionMax[1])/2, (unionMin[2]+unionMax[2])/2]
      }
    };
  });

  console.log('Knot bbox center:', geo.knot.bboxCenter.map(v=>v.toFixed(6)));
  console.log('Halo bbox center:', geo.halo.bboxCenter.map(v=>v.toFixed(6)));
  console.log('Union world bbox centre:', geo.unionWorldBbox.center.map(v=>v.toFixed(6)));
  console.log('Pre-fix probe value: [0.1463, 0.0385, 0.0157]');

  await browser.close();
}

main().catch(err => { console.error(err); process.exit(1); });
