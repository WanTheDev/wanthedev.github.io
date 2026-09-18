import * as THREE from 'three';
const FOV=46, CAMZ=10.5;
const VPS=[[1920,1080],[2560,1440],[1280,800],[1024,768],[800,600],[1600,500],[1366,768],[390,844],[320,480]];
// build the object exactly like scene.js (group rot + knot rot at t=0)
const group=new THREE.Group(); group.rotation.set(-0.18,0.35,0.08); group.updateMatrixWorld(true);
const knot=new THREE.Mesh(new THREE.TorusKnotGeometry(1.9,0.4,90,4,2,3));
knot.rotation.set(0,0,0); knot.updateMatrixWorld(true);
const halo=new THREE.Mesh(new THREE.TorusKnotGeometry(1.7,0.5,96,10,2,3)); halo.updateMatrixWorld(true);
const MESHES=[knot,halo];
// world-space vertices at t=0
const worldVerts=[];
for(const m of MESHES){ const pos=m.geometry.attributes.position;
  for(let i=0;i<pos.count;i++){ const v=new THREE.Vector3().fromBufferAttribute(pos,i); v.applyMatrix4(m.matrixWorld).applyMatrix4(group.matrixWorld); worldVerts.push(v);} }
const wb=new THREE.Box3(); for(const v of worldVerts) wb.expandByPoint(v);
const wc=new THREE.Vector3(); wb.getCenter(wc);
const wmean=new THREE.Vector3(); for(const v of worldVerts) wmean.add(v); wmean.divideScalar(worldVerts.length);
const wsphere=wb.getBoundingSphere(new THREE.Sphere());
console.log('world bbox min',wb.min.toArray().map(v=>+v.toFixed(4)));
console.log('world bbox max',wb.max.toArray().map(v=>+v.toFixed(4)));
console.log('world bbox CENTRE',wc.toArray().map(v=>+v.toFixed(4)));
console.log('world vertex MEAN',wmean.toArray().map(v=>+v.toFixed(4)));
console.log('world bounding SPHERE centre',wsphere.center.toArray().map(v=>+v.toFixed(4)),'radius',+wsphere.radius.toFixed(4));

function run(target,dist,label){
  console.log('\n===== target',target.toArray().map(v=>+v.toFixed(4)).join(','),' dist',dist,' =====');
  const rows=[];
  for(const [W,H] of VPS){
    const aspect=W/H;
    const d = typeof dist==='function'? dist(aspect):dist;
    const cam=new THREE.PerspectiveCamera(FOV,aspect,0.1,40);
    cam.position.set(0,0,d); cam.lookAt(target); cam.updateMatrixWorld(true); cam.updateProjectionMatrix();
    let minx=9,maxx=-9,miny=9,maxy=-9,sx=0,sy=0;
    for(const v of worldVerts){ const q=v.clone().project(cam); minx=Math.min(minx,q.x);maxx=Math.max(maxx,q.x);miny=Math.min(miny,q.y);maxy=Math.max(maxy,q.y); sx+=q.x;sy+=q.y; }
    const n=worldVerts.length;
    rows.push({vp:`${W}x${H}`,cx:+(0.5+(minx+maxx)/4).toFixed(4),cy:+(0.5-(miny+maxy)/4).toFixed(4),
      meanCx:+(0.5+sx/n/2).toFixed(4),meanCy:+(0.5-sy/n/2).toFixed(4),
      spanW:+((maxx-minx)/2).toFixed(4),spanH:+((maxy-miny)/2).toFixed(4),
      clipped:(minx<-1||maxx>1||miny<-1||maxy>1)});
  }
  console.table(rows);
  const cx=rows.map(r=>r.cx), cy=rows.map(r=>r.cy);
  console.log(`SPREAD  bboxCx ${(Math.max(...cx)-Math.min(...cx)).toFixed(4)}  bboxCy ${(Math.max(...cy)-Math.min(...cy)).toFixed(4)}  clippedCount ${rows.filter(r=>r.clipped).length}`);
  return rows;
}
run(new THREE.Vector3(0,0,0),CAMZ,'origin');
run(new THREE.Vector3(0.75,-0.75,0),CAMZ,'current magic');
run(wc.clone(),CAMZ,'union bbox centre');
run(wsphere.center.clone(),CAMZ,'bounding-sphere centre');
run(wmean.clone(),CAMZ,'vertex mean');

// ---- fit distance so the projected bbox always fits inside the frame with margin ----
console.log('\n===== aspect-fitted distance (bbox projects inside frame) =====');
const R = wsphere.radius; // sphere radius around sphere centre
const hFov = (aspect)=> 2*Math.atan(Math.tan(FOV*Math.PI/360)*aspect);
for(const [W,H] of VPS){
  const aspect=W/H;
  const tanV=Math.tan(FOV*Math.PI/360), tanH=tanV*aspect;
  // sphere fit: d such that R / sqrt(d^2-R^2) <= min(tanV,tanH) * margin
  const margin=0.86;
  const lim=Math.min(tanV,tanH)*margin;
  const d = R/Math.sqrt(1/(lim*lim)+1); // solve R/sqrt(d^2-R^2)=lim -> d=R*sqrt(1/lim^2+1)
  console.log(`${W}x${H} aspect ${aspect.toFixed(3)}  minFovTan ${Math.min(tanV,tanH).toFixed(4)}  fitted d ${d.toFixed(3)}`);
}
