import * as THREE from 'three';
const g = new THREE.TorusKnotGeometry(1.9, 0.4, 90, 4, 2, 3);
g.computeBoundingBox();
const bb = g.boundingBox;
const c = new THREE.Vector3(); bb.getCenter(c);
console.log('knot bbox min', bb.min.toArray().map(v=>v.toFixed(4)).join(','));
console.log('knot bbox max', bb.max.toArray().map(v=>v.toFixed(4)).join(','));
console.log('knot bbox CENTER', c.toArray().map(v=>v.toFixed(4)).join(','));
g.computeBoundingSphere();
console.log('knot boundSphere center', g.boundingSphere.center.toArray().map(v=>v.toFixed(4)).join(','), 'r=', g.boundingSphere.radius.toFixed(4));
// brute-force visible-surface centroid proxy: average of all tube-surface vertices
const pos = g.attributes.position;
const sum = new THREE.Vector3();
for (let i=0;i<pos.count;i++) sum.add(new THREE.Vector3().fromBufferAttribute(pos,i));
sum.divideScalar(pos.count);
console.log('vertex mean (centroid)', sum.toArray().map(v=>v.toFixed(4)).join(','));
const h = new THREE.TorusKnotGeometry(1.7, 0.5, 96, 10, 2, 3);
h.computeBoundingBox();
const hc = new THREE.Vector3(); h.boundingBox.getCenter(hc);
console.log('halo bbox CENTER', hc.toArray().map(v=>v.toFixed(4)).join(','));
// group rotation applied to the knot bbox center
const grp = new THREE.Group(); grp.rotation.set(-0.18, 0.35, 0.08); grp.updateMatrixWorld();
console.log('knot bbox center in WORLD', c.clone().applyMatrix4(grp.matrixWorld).toArray().map(v=>v.toFixed(4)).join(','));
// screen offset math for the current magic target at a few viewports
const T = new THREE.Vector3(0.75,-0.75,0);
console.log('\n-- projected screen offset of world (0,0,0) vs target, camera at (0,0,d), fov46 --');
for (const [W,H] of [[1920,1080],[2560,1440],[1280,800],[1024,768],[800,600],[1600,500],[390,844]]) {
  const d=10.5, aspect=W/H, halfH=d*Math.tan(46*Math.PI/360);
  // camera at (0,0,d) looking at T: build the view basis
  const cam=new THREE.PerspectiveCamera(46,aspect,0.1,40); cam.position.set(0,0,d); cam.lookAt(T); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
  const o=new THREE.Vector3(0,0,0).project(cam);
  const px=(o.x*0.5+0.5)*W, py=(0.5-o.y*0.5)*H;
  console.log(`${W}x${H} aspect=${aspect.toFixed(3)}  centroid@screen ${px.toFixed(1)},${py.toFixed(1)}  offset from centre ${(px-W/2).toFixed(1)},${(py-H/2).toFixed(1)} px  = ${(100*(px-W/2)/W).toFixed(2)}% W  ${(100*(py-H/2)/H).toFixed(2)}% H`);
}
