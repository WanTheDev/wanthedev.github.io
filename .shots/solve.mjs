import * as THREE from 'three';
const VFOV=46, TANV=Math.tan(VFOV*Math.PI/360);
const VPS=[[1920,1080],[2560,1440],[1280,800],[1024,768],[800,600],[1600,500],[1366,768],[390,844],[320,480]];
const TIMES=[0,1,2,3,4,5,6,7,8,9,10,11,12,14,16,18,20,22,24];
// geometry (group-level, rotation applied per time)
const gk=new THREE.BufferGeometry().copy? null:null;
const knotGeo=new THREE.TorusKnotGeometry(1.9,0.4,90,4,2,3);
const haloGeo=new THREE.TorusKnotGeometry(1.7,0.5,96,10,2,3);
function vertsAt(t){
  const g=new THREE.Group(); g.rotation.set(-0.18,0.35,Math.sin(t*0.12)*0.12); g.updateMatrixWorld(true);
  const k=new THREE.Mesh(knotGeo); k.rotation.set(t*0.21*0.7,t*0.21,0); k.updateMatrixWorld(true);
  const m1=new THREE.Matrix4().multiplyMatrices(g.matrixWorld,k.matrixWorld);
  const h=new THREE.Mesh(haloGeo); h.scale.setScalar(1.06); h.rotation.copy(k.rotation); h.updateMatrixWorld(true);
  const m2=new THREE.Matrix4().multiplyMatrices(g.matrixWorld,h.matrixWorld);
  const out=[];
  for(const [geo,M] of [[knotGeo,m1],[haloGeo,m2]]){
    const p=geo.attributes.position;
    for(let i=0;i<p.count;i++) out.push(new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(M));
  }
  return out;
}
const SAMPLES=TIMES.map(vertsAt);
function projStats(target,d){ // returns {cx,cy,spanW,spanH,clipped} averaged over time
  let sx=0,sy=0,minx=9,maxx=-9,miny=9,maxy=-9,clipped=false;
  for(const vs of SAMPLES){
    const cam=new THREE.PerspectiveCamera(VFOV, 16/9, 0.1, 40);
    cam.position.set(0,0,d); cam.lookAt(target); cam.updateMatrixWorld(true); cam.updateProjectionMatrix();
    let a=9,b=-9,c=9,e=-9;
    for(const v of vs){ const q=v.clone().project(cam); a=Math.min(a,q.x);b=Math.max(b,q.x);c=Math.min(c,q.y);e=Math.max(e,q.y); }
    sx+=(a+b)/2; sy+=(c+e)/2; minx=Math.min(minx,a);maxx=Math.max(maxx,b);miny=Math.min(miny,c);maxy=Math.max(maxy,e);
    if(a<-1||b>1||c<-1||e>1) clipped=true;
  }
  const n=SAMPLES.length;
  return {cx:0.5+sx/n/2, cy:0.5-sy/n/2, spanW:(maxx-minx)/2, spanH:(maxy-miny)/2, clipped};
}
// swept radius from a centre
function sweptRadius(centre){ let R=0; for(const vs of SAMPLES) for(const v of vs) R=Math.max(R, v.distanceTo(centre)); return R; }

// ---- solve the target: iterate so the time-averaged projected bbox centre is (0.5,0.5) at 16:9 ----
function solveTarget(d=10.5){
  const t=new THREE.Vector3(0,0,0);
  for(let it=0; it<8; it++){
    const s=projStats(t,d);
    const wpfX=2*d*TANV*(16/9), wpfY=2*d*TANV;
    t.x -= (s.cx-0.5)*wpfX;
    t.y += (s.cy-0.5)*wpfY;
  }
  return t;
}
const solved=solveTarget(10.5);
console.log('SOLVED target (16:9, d=10.5):', solved.toArray().map(v=>+v.toFixed(4)).join(', '));
const R=sweptRadius(solved);
console.log('swept radius about solved target:', +R.toFixed(4));
const RefAspect=16/9;
const REFD=10.5;
const fitDist=(aspect)=> REFD*Math.max(1, RefAspect/aspect);

function table(target,label,dOf){
  console.log('\n===== '+label+' =====');
  const rows=[];
  for(const [W,H] of VPS){
    const a=W/H, d=dOf?dOf(a):REFD;
    const cam=new THREE.PerspectiveCamera(VFOV,a,0.1,40); cam.position.set(0,0,d); cam.lookAt(target); cam.updateMatrixWorld(true); cam.updateProjectionMatrix();
    let minx=9,maxx=-9,miny=9,maxy=-9,sx=0,sy=0,clip=false;
    for(const vs of SAMPLES){
      for(const v of vs){ const q=v.clone().project(cam); minx=Math.min(minx,q.x);maxx=Math.max(maxx,q.x);miny=Math.min(miny,q.y);maxy=Math.max(maxy,q.y); sx+=q.x;sy+=q.y; }
      let a2=9,b2=-9,c2=9,e2=-9;
      for(const v of vs){ const q=v.clone().project(cam); a2=Math.min(a2,q.x);b2=Math.max(b2,q.x);c2=Math.min(c2,q.y);e2=Math.max(e2,q.y); }
      if(a2<-1||b2>1||c2<-1||e2>1) clip=true;
    }
    const n=SAMPLES.length*vs.length;
    rows.push({vp:`${W}x${H}`,d:+d.toFixed(2),cx:+(0.5+(minx+maxx)/4).toFixed(4),cy:+(0.5-(miny+maxy)/4).toFixed(4),
      spanW:+((maxx-minx)/2).toFixed(4),spanH:+((maxy-miny)/2).toFixed(4),clip});
  }
  console.table(rows);
  const cx=rows.map(r=>r.cx),cy=rows.map(r=>r.cy);
  console.log(`cx spread ${(Math.max(...cx)-Math.min(...cx)).toFixed(4)}  cy spread ${(Math.max(...cy)-Math.min(...cy)).toFixed(4)}  clipped ${rows.filter(r=>r.clip).length}/${rows.length}`);
  return rows;
}
table(new THREE.Vector3(0.75,-0.75,0),'CURRENT user target (0.75,-0.75,0), fixed d=10.5',null);
table(new THREE.Vector3(0,0,0),'ORIGINAL target origin, fixed d=10.5',null);
table(solved,'SOLVED target, fixed d=10.5',null);
table(solved,'SOLVED target + aspect-aware d = 10.5*max(1, 16/9/aspect)',fitDist);
