import * as THREE from 'three';
const VFOV=46, TANV=Math.tan(VFOV*Math.PI/360);
const VPS=[[1920,1080],[2560,1440],[1280,800],[1024,768],[800,600],[1600,500],[1366,768],[390,844],[320,480],[400,3000],[3000,400]];
const TIMES=Array.from({length:41},(_,i)=>i*0.6); // 0..24s
const knotGeo=new THREE.TorusKnotGeometry(1.9,0.4,90,4,2,3);
const haloGeo=new THREE.TorusKnotGeometry(1.7,0.5,96,10,2,3);
function vertsAt(t){
  const g=new THREE.Group(); g.rotation.set(-0.18,0.35,Math.sin(t*0.12)*0.12); g.updateMatrixWorld(true);
  const k=new THREE.Mesh(knotGeo); k.rotation.set(t*0.21*0.7,t*0.21,0); k.updateMatrixWorld(true);
  const m1=k.matrixWorld.clone().premultiply(g.matrixWorld);
  const h=new THREE.Mesh(haloGeo); h.scale.setScalar(1.06); h.rotation.copy(k.rotation); h.updateMatrixWorld(true);
  const m2=h.matrixWorld.clone().premultiply(g.matrixWorld);
  const s=1.06+Math.sin(t*0.8)*0.02;
  const m2s=m2.clone().multiply(new THREE.Matrix4().makeScale(s,s,s));
  const out=[];
  for(const [geo,M] of [[knotGeo,m1],[haloGeo,m2s]]){
    const p=geo.attributes.position;
    for(let i=0;i<p.count;i++) out.push(new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(M));
  }
  return out;
}
const SAMPLES=TIMES.map(vertsAt);
// swept sphere: minimise max distance -> use bbox of all points as a tight start, then sphere from bbox
const allPts=SAMPLES.flat();
const bb=new THREE.Box3(); for(const p of allPts) bb.expandByPoint(p);
const c=new THREE.Vector3(); bb.getCenter(c);
let R=0; for(const p of allPts) R=Math.max(R,p.distanceTo(c));
console.log('SWEPT bbox min',bb.min.toArray().map(v=>+v.toFixed(3)));
console.log('SWEPT bbox max',bb.max.toArray().map(v=>+v.toFixed(3)));
console.log('SWEPT SPHERE centre',c.toArray().map(v=>+v.toFixed(4)));
console.log('SWEPT SPHERE radius',+R.toFixed(4));

function frameStats(target,dOf,label){
  const rows=[];
  for(const [W,H] of VPS){
    const aspect=W/H, d=dOf(aspect);
    const cam=new THREE.PerspectiveCamera(VFOV,aspect,0.1,60);
    cam.position.set(0,0,d); cam.lookAt(target); cam.updateMatrixWorld(true); cam.updateProjectionMatrix();
    let gminx=9,gmaxx=-9,gminy=9,gmaxy=-9,clipped=false,worstClip=0;
    let cxSum=0,cySum=0,n=0;
    for(const vs of SAMPLES){
      let a=9,b=-9,cc=9,e=-9;
      for(const v of vs){ const q=v.clone().project(cam); a=Math.min(a,q.x);b=Math.max(b,q.x);cc=Math.min(cc,q.y);e=Math.max(e,q.y); }
      cxSum+=0.5+(a+b)/4; cySum+=0.5-(cc+e)/4; n++;
      gminx=Math.min(gminx,a);gmaxx=Math.max(gmaxx,b);gminy=Math.min(gminy,cc);gmaxy=Math.max(gmaxy,e);
      const over=Math.max(0,-a,b-1,-cc,e-1); if(over>0){clipped=true;worstClip=Math.max(worstClip,over);}
    }
    rows.push({vp:`${W}x${H}`,d:+d.toFixed(2),cx:+(cxSum/n).toFixed(4),cy:+(cySum/n).toFixed(4),
      spanW:+((gmaxx-gminx)/2).toFixed(3),spanH:+((gmaxy-gminy)/2).toFixed(3),clip:clipped,worst:+(worstClip*50).toFixed(1)+'%'});
  }
  const cx=rows.map(r=>r.cx),cy=rows.map(r=>r.cy);
  console.log(`\n== ${label}`);
  console.table(rows);
  console.log(`  cx spread ${(Math.max(...cx)-Math.min(...cx)).toFixed(4)} (${((Math.max(...cx)-Math.min(...cx))*100).toFixed(2)}% of width)  cy spread ${(Math.max(...cy)-Math.min(...cy)).toFixed(4)}  clipped ${rows.filter(r=>r.clip).length}/${rows.length}`);
  return rows;
}
const REF=16/9, DREF=10.5;
frameStats(new THREE.Vector3(0.75,-0.75,0),()=>DREF,'CURRENT: target (0.75,-0.75,0), fixed d=10.5');
frameStats(new THREE.Vector3(0,0,0),()=>DREF,'ORIGINAL: target (0,0,0), fixed d=10.5');
frameStats(c,()=>DREF,'CENTRE target, fixed d=10.5 (aspect bug remains)');
frameStats(c,a=>DREF*Math.max(1,REF/a),'CENTRE target + d = dRef*max(1, refAspect/aspect)  <-- PROPOSED');
// tighter: derive d from the swept sphere + margin, keeping the same look at 16:9
const margin=0.98;
const fitD=(a)=>{ const k=TANV*Math.min(1,a)*margin; return R*Math.sqrt(1/(k*k)+1); };
console.log('\nfitted distance from swept sphere (R='+R.toFixed(3)+'): d(16:9)='+fitD(REF).toFixed(3)+'  d(1.333)='+fitD(4/3).toFixed(3)+'  d(0.462)='+fitD(0.462).toFixed(3));
frameStats(c,fitD,'CENTRE target + swept-sphere fitted d (margin '+margin+')');
