import * as THREE from 'three';
const VFOV=46, TANV=Math.tan(VFOV*Math.PI/360), REF=16/9, DREF=10.5;
const VPS=[[1920,1080],[2560,1440],[1280,800],[1024,768],[800,600],[1600,500],[1366,768],[390,844],[320,480],[3000,400],[400,3000]];
const knotGeo=new THREE.TorusKnotGeometry(1.9,0.4,90,4,2,3);
const haloGeo=new THREE.TorusKnotGeometry(1.7,0.5,96,10,2,3);
const HALO=1.06;

// ---- design A: derived from raw geometry in GROUP-LOCAL space (what scene.js will do) ----
const localBox=new THREE.Box3();
for (const [geo,scale] of [[knotGeo,1],[haloGeo,HALO]]){
  const p=geo.attributes.position;
  for(let i=0;i<p.count;i++) localBox.expandByPoint(new THREE.Vector3().fromBufferAttribute(p,i).multiplyScalar(scale));
}
const derived=new THREE.Vector3(); localBox.getCenter(derived);
let swept=0;
for (const [geo,scale] of [[knotGeo,1],[haloGeo,HALO]]){
  const p=geo.attributes.position;
  for(let i=0;i<p.count;i++){ const v=new THREE.Vector3().fromBufferAttribute(p,i).multiplyScalar(scale); swept=Math.max(swept,v.distanceTo(derived)); }
}
console.log('A) derived LOCAL bbox centre      =', derived.toArray().map(v=>+v.toFixed(4)).join(', '));
console.log('   local bbox min',localBox.min.toArray().map(v=>+v.toFixed(3)),'max',localBox.max.toArray().map(v=>+v.toFixed(3)));
console.log('   radius about derived centre      =', +swept.toFixed(4));

// ---- frames: replicate scene.js update() ----
const TIMES=Array.from({length:81},(_,i)=>i*0.3); // 0..24s
function cameraAt(t, targetLocal, aspect, dist){
  const g=new THREE.Group(); g.rotation.set(-0.18,0.35,Math.sin(t*0.12)*0.12); g.updateMatrixWorld(true);
  const tw=targetLocal.clone().applyMatrix4(g.matrixWorld);
  const cam=new THREE.PerspectiveCamera(VFOV,aspect,0.1,80); cam.position.set(0,0,dist); cam.lookAt(tw);
  cam.updateMatrixWorld(true); cam.updateProjectionMatrix();
  const k=new THREE.Mesh(knotGeo); k.rotation.set(t*0.21*0.7,t*0.21,0); k.updateMatrixWorld(true);
  const km=k.matrixWorld.clone().premultiply(g.matrixWorld);
  const h=new THREE.Mesh(haloGeo); h.rotation.copy(k.rotation); h.updateMatrixWorld(true);
  const s=1.06+Math.sin(t*0.8)*0.02;
  const hm=h.matrixWorld.clone().premultiply(g.matrixWorld).multiply(new THREE.Matrix4().makeScale(s,s,s));
  return {cam, mats:[km,hm]};
}
function evaluate(targetLocal,label,distOf){
  const rows=[];
  for(const [W,H] of VPS){
    const aspect=W/H, dist=distOf(aspect);
    let minx=9,maxx=-9,miny=9,maxy=-9,clip=false,worst=0,cxS=0,cyS=0;
    for(const t of TIMES){
      const {cam,mats}=cameraAt(t,targetLocal,aspect,dist);
      let a=9,b=-9,c=9,e=-9;
      for(const [geo,M] of [[knotGeo,mats[0]],[haloGeo,mats[1]]]){
        const p=geo.attributes.position;
        for(let i=0;i<p.count;i++){
          const q=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(M).project(cam);
          if(q.x<a)a=q.x; if(q.x>b)b=q.x; if(q.y<c)c=q.y; if(q.y>e)e=q.y;
        }
      }
      cxS+=0.5+(a+b)/4; cyS+=0.5-(c+e)/4;
      minx=Math.min(minx,a);maxx=Math.max(maxx,b);miny=Math.min(miny,c);maxy=Math.max(maxy,e);
      const over=Math.max(0,-a,b-1,-c,e-1); if(over>0){clip=true;worst=Math.max(worst,over);}
    }
    const n=TIMES.length;
    rows.push({vp:`${W}x${H}`,d:+dist.toFixed(2),cx:+(cxS/n).toFixed(4),cy:+(cyS/n).toFixed(4),
      spanW:+((maxx-minx)/2).toFixed(3),spanH:+((maxy-miny)/2).toFixed(3),clip, over:+worst.toFixed(3)});
  }
  const cx=rows.map(r=>r.cx),cy=rows.map(r=>r.cy);
  const spreadX=Math.max(...cx)-Math.min(...cx), spreadY=Math.max(...cy)-Math.min(...cy);
  console.log('\n===== '+label);
  console.table(rows);
  console.log(`  CENTRE SPREAD  x ${(spreadX*100).toFixed(2)}%  y ${(spreadY*100).toFixed(2)}%   off-centre@1080p: (${rows[0].cx.toFixed(3)}, ${rows[0].cy.toFixed(3)})   clipped ${rows.filter(r=>r.clip).length}/${rows.length}`);
  return {rows,spreadX,spreadY};
}
const fixed=()=>DREF;
const aspectFit=a=>DREF*Math.max(1,REF/Math.max(a,1e-3));
evaluate(new THREE.Vector3(0.75,-0.75,0),'BASELINE current code: target (0.75,-0.75,0), d fixed 10.5',fixed);
evaluate(derived,'FIX: derived local centre, d fixed 10.5 (centred but still cropped)',fixed);
evaluate(derived,'FIX: derived local centre + d = cameraZ*max(1, refAspect/aspect)  <-- PROPOSED',aspectFit);
