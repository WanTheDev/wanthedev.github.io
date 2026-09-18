import * as THREE from 'three';
const VFOV=46, REF=16/9, DREF=10.5;
const VPS=[[1920,1080],[2560,1440],[1280,800],[1024,768],[800,600],[1600,500],[1366,768],[390,844],[320,480],[3000,400],[400,3000]];
const knotGeo=new THREE.TorusKnotGeometry(1.9,0.4,90,4,2,3);
const haloGeo=new THREE.TorusKnotGeometry(1.7,0.5,96,10,2,3);
const HALO=1.06;
const lb=new THREE.Box3();
for(const [g,s] of [[knotGeo,1],[haloGeo,HALO]]){const p=g.attributes.position;for(let i=0;i<p.count;i++)lb.expandByPoint(new THREE.Vector3().fromBufferAttribute(p,i).multiplyScalar(s));}
const derived=new THREE.Vector3(); lb.getCenter(derived);
console.log('DERIVED local bbox centre', derived.toArray().map(v=>+v.toFixed(4)).join(', '));
const TIMES=Array.from({length:81},(_,i)=>i*0.3);
function evalRun(targetLocal,label,distOf){
  const rows=[];
  for(const [W,H] of VPS){
    const aspect=W/H, dist=distOf(aspect);
    let mnx=9,mxx=-9,mny=9,mxy=-9,clip=false,worst=0,cxS=0,cyS=0;
    for(const t of TIMES){
      const g=new THREE.Group(); g.rotation.set(-0.18,0.35,Math.sin(t*0.12)*0.12); g.updateMatrixWorld(true);
      const tw=targetLocal.clone().applyMatrix4(g.matrixWorld);
      const cam=new THREE.PerspectiveCamera(VFOV,aspect,0.1,80); cam.position.set(0,0,dist); cam.lookAt(tw);
      cam.updateMatrixWorld(true); cam.updateProjectionMatrix();
      const k=new THREE.Mesh(knotGeo); k.rotation.set(t*0.21*0.7,t*0.21,0); k.updateMatrixWorld(true);
      const km=k.matrixWorld.clone().premultiply(g.matrixWorld);
      const h=new THREE.Mesh(haloGeo); h.rotation.copy(k.rotation); h.updateMatrixWorld(true);
      const s=1.06+Math.sin(t*0.8)*0.02;
      const hm=h.matrixWorld.clone().premultiply(g.matrixWorld).multiply(new THREE.Matrix4().makeScale(s,s,s));
      let a=9,b=-9,c=9,e=-9;
      for(const [geo,M] of [[knotGeo,km],[haloGeo,hm]]){
        const p=geo.attributes.position;
        for(let i=0;i<p.count;i++){
          const q=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(M).project(cam);
          if(q.x<a)a=q.x; if(q.x>b)b=q.x; if(q.y<c)c=q.y; if(q.y>e)e=q.y;
        }
      }
      cxS+=0.5+(a+b)/4; cyS+=0.5-(c+e)/4;
      mnx=Math.min(mnx,a);mxx=Math.max(mxx,b);mny=Math.min(mny,c);mxy=Math.max(mxy,e);
      const over=Math.max(0, -1-a, b-1, -1-c, e-1);   // <-- CORRECTED
      if(over>0){clip=true;worst=Math.max(worst,over);}
    }
    const n=TIMES.length;
    rows.push({vp:`${W}x${H}`,d:+dist.toFixed(1),cx:+(cxS/n).toFixed(4),cy:+(cyS/n).toFixed(4),
      spanW:+((mxx-mnx)/2).toFixed(3),spanH:+((mxy-mny)/2).toFixed(3),
      clip, over:+(worst/2*100).toFixed(1)+'%'});
  }
  const cx=rows.map(r=>r.cx),cy=rows.map(r=>r.cy);
  console.log('\n===== '+label);
  console.table(rows);
  console.log(`  centre spread x ${((Math.max(...cx)-Math.min(...cx))*100).toFixed(2)}%  y ${((Math.max(...cy)-Math.min(...cy))*100).toFixed(2)}%   @1080p centre (${rows[0].cx}, ${rows[0].cy})   clipped ${rows.filter(r=>r.clip).length}/${rows.length}`);
}
const fixed=()=>DREF, aspectFit=a=>DREF*Math.max(1,REF/Math.max(a,1e-3));
evalRun(new THREE.Vector3(0.75,-0.75,0),'BASELINE: target(0.75,-0.75,0), d fixed 10.5  [CURRENT CODE]',fixed);
evalRun(derived,'FIX stage 1: derived centre, d fixed 10.5',fixed);
evalRun(derived,'FIX stage 2: derived centre + aspect-fit distance [PROPOSED]',aspectFit);
