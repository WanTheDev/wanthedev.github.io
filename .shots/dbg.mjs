import * as THREE from 'three';
const knotGeo=new THREE.TorusKnotGeometry(1.9,0.4,90,4,2,3);
const haloGeo=new THREE.TorusKnotGeometry(1.7,0.5,96,10,2,3);
const derived=new THREE.Vector3(-0.0392,-0.0002,0.0002); // placeholder, recomputed below
const lb=new THREE.Box3();
for(const [g,s] of [[knotGeo,1],[haloGeo,1.06]]){const p=g.attributes.position;for(let i=0;i<p.count;i++)lb.expandByPoint(new THREE.Vector3().fromBufferAttribute(p,i).multiplyScalar(s));}
lb.getCenter(derived);
console.log('derived',derived.toArray().map(v=>+v.toFixed(4)));
for(const [W,H] of [[1920,1080],[390,844]]){
  const aspect=W/H;
  let worst={over:0,t:null,ndc:null};
  for(let i=0;i<=80;i++){
    const t=i*0.3, d=10.5*Math.max(1,(16/9)/aspect);
    const g=new THREE.Group(); g.rotation.set(-0.18,0.35,Math.sin(t*0.12)*0.12); g.updateMatrixWorld(true);
    const tw=derived.clone().applyMatrix4(g.matrixWorld);
    const cam=new THREE.PerspectiveCamera(46,aspect,0.1,80); cam.position.set(0,0,d); cam.lookAt(tw); cam.updateMatrixWorld(true); cam.updateProjectionMatrix();
    const k=new THREE.Mesh(knotGeo); k.rotation.set(t*0.21*0.7,t*0.21,0); k.updateMatrixWorld(true);
    const km=k.matrixWorld.clone().premultiply(g.matrixWorld);
    const h=new THREE.Mesh(haloGeo); h.rotation.copy(k.rotation); h.updateMatrixWorld(true);
    const s=1.06+Math.sin(t*0.8)*0.02;
    const hm=h.matrixWorld.clone().premultiply(g.matrixWorld).multiply(new THREE.Matrix4().makeScale(s,s,s));
    for(const [geo,M,name] of [[knotGeo,km,'knot'],[haloGeo,hm,'halo']]){
      const p=geo.attributes.position;
      for(let j=0;j<p.count;j++){
        const v=new THREE.Vector3().fromBufferAttribute(p,j).applyMatrix4(M);
        const q=v.clone().project(cam);
        const over=Math.max(0,-q.x,q.x-1,-q.y,q.y-1);
        if(over>worst.over) worst={over,t:t.toFixed(2),ndc:[+q.x.toFixed(3),+q.y.toFixed(3),+q.z.toFixed(4)],mesh:name,world:v.toArray().map(x=>+x.toFixed(2)),camz:+v.distanceTo(cam.position).toFixed(2)};
      }
    }
  }
  console.log(`${W}x${H} d=${(10.5*Math.max(1,(16/9)/aspect)).toFixed(2)} worst over=${worst.over.toFixed(4)} at t=${worst.t} mesh=${worst.mesh} ndc=${worst.ndc} world=${worst.world} distToCam=${worst.camz}`);
}
