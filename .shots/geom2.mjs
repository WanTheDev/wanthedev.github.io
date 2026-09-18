import * as THREE from 'three';
const FOV = 46, CAMZ = 10.5, ASPECTS = [[1920,1080],[2560,1440],[1280,800],[1024,768],[800,600],[1600,500],[1366,768],[390,844],[320,480]];
const group = new THREE.Group(); group.rotation.set(-0.18, 0.35, 0.08); group.updateMatrixWorld(true);
function mesh(r,t,seg,rad){ const m=new THREE.Mesh(new THREE.TorusKnotGeometry(r,t,seg,seg===90?4:10,2,3)); m.updateMatrixWorld(); return m; }
const knot = mesh(1.9,0.4,90); const halo = mesh(1.7,0.5,96);
const all = [knot, halo];

function worldPoints(t){ // t = seconds, replicate scene.update
  const kx = t*0.21*0.7, ky = t*0.21, gz = Math.sin(t*0.12)*0.12;
  const g = new THREE.Group(); g.rotation.set(-0.18,0.35,gz); g.updateMatrixWorld(true);
  const km = new THREE.Mesh(new THREE.BufferGeometry()); km.rotation.set(kx,ky,0); km.updateMatrixWorld(true);
  return {g, km};
}
function project(pts, camera){ return pts.map(p=>p.clone().project(camera)); }

function analyse(target, t=0){
  const {g, km} = worldPoints(t);
  const out=[];
  for (const [W,H] of ASPECTS){
    const cam = new THREE.PerspectiveCamera(FOV, W/H, 0.1, 40);
    cam.position.set(0,0,CAMZ); cam.lookAt(target); cam.updateMatrixWorld(true); cam.updateProjectionMatrix();
    // union of knot+halo vertices in world (group rot * knot rot)
    let minx=9,maxx=-9,miny=9,maxy=-9, sx=0,sy=0,n=0;
    const pts=[];
    for (const m of all){
      const pos=m.geometry.attributes.position;
      for(let i=0;i<pos.count;i++){
        const v=new THREE.Vector3().fromBufferAttribute(pos,i);
        v.applyMatrix4(m===knot?km.matrixWorld:new THREE.Matrix4());
        v.applyMatrix4(g.matrixWorld);
        const q=v.clone().project(cam);
        pts.push(q);
        minx=Math.min(minx,q.x);maxx=Math.max(maxx,q.x);miny=Math.min(miny,q.y);maxy=Math.max(maxy,q.y);
        sx+=q.x;sy+=q.y;n++;
      }
    }
    // centre in NDC, and as fraction of frame
    const ndcCx=(minx+maxx)/2, ndcCy=(miny+maxy)/2;
    const fracCx=0.5+ndcCx/2, fracCy=0.5-ndcCy/2;
    const meanCx=0.5+(sx/n)/2, meanCy=0.5-(sy/n)/2;
    const spanX=(maxx-minx)/2, spanY=(maxy-miny)/2;  // as fraction of frame
    out.push({vp:`${W}x${H}`,aspect:+(W/H).toFixed(3),fracCx:+fracCx.toFixed(4),fracCy:+fracCy.toFixed(4),
      meanCx:+meanCx.toFixed(4),meanCy:+meanCy.toFixed(4),
      spanX:+spanX.toFixed(4),spanY:+spanY.toFixed(4),
      clipped: (minx<-1||maxx>1||miny<-1||maxy>1)});
  }
  return out;
}
console.log('=== CURRENT target (0.75,-0.75,0) ===');
console.table(analyse(new THREE.Vector3(0.75,-0.75,0),0));
// world space: how far is the object bbox centre from the target, in camera right/up
const cam=new THREE.PerspectiveCamera(FOV,16/9,0.1,40); cam.position.set(0,0,CAMZ); cam.lookAt(new THREE.Vector3(0.75,-0.75,0)); cam.updateMatrixWorld(true);
const {g,km}=worldPoints(0);
const bb=new THREE.Box3();
for(const m of all){ const pos=m.geometry.attributes.position;
  for(let i=0;i<pos.count;i++){ const v=new THREE.Vector3().fromBufferAttribute(pos,i); if(m===knot) v.applyMatrix4(km.matrixWorld); v.applyMatrix4(g.matrixWorld); bb.expandByPoint(v);} }
const c=new THREE.Vector3(); bb.getCenter(c);
console.log('\nunion bbox in world: min',bb.min.toArray().map(v=>+v.toFixed(4)),'max',bb.max.toArray().map(v=>+v.toFixed(4)),'centre',c.toArray().map(v=>+v.toFixed(4)));
console.log('target to bbox-centre delta', c.clone().sub(new THREE.Vector3(0.75,-0.75,0)).toArray().map(v=>+v.toFixed(4)));
const inv=cam.matrixWorldInverse, P=cam.projectionMatrix;
const toScreen=(p)=>{const q=p.clone().applyMatrix4(inv).applyMatrix4(P); return q;};
const o=toScreen(new THREE.Vector3(0,0,0));
console.log('world origin projects to NDC', o.x.toFixed(4), o.y.toFixed(4), '-> frac', (0.5+o.x/2).toFixed(4), (0.5-o.y/2).toFixed(4));
const bc=toScreen(c);
console.log('union bbox centre projects to NDC', bc.x.toFixed(4), bc.y.toFixed(4), '-> frac', (0.5+bc.x/2).toFixed(4), (0.5-bc.y/2).toFixed(4));
const t2=toScreen(new THREE.Vector3(0.75,-0.75,0));
console.log('target projects to NDC', t2.x.toFixed(6), t2.y.toFixed(6), '(sanity: should be 0,0)');
