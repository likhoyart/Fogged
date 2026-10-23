'use strict';
// Approved September 13: six asset types, plus existing licensed fence panels.
const STREET_PROP_ASSETS={},streetPropTemplates={},streetPropObjects=[],streetPropFences=[];
const streetPropLayout=[
 {type:'broken-bicycle',x:45,z:-8.4,yaw:.12,scale:1},
 {type:'barrier',x:-4.2,z:-74,yaw:.04},{type:'barrier',x:.4,z:-75,yaw:-.08},{type:'barrier',x:76,z:2.7,yaw:Math.PI/2},
 ...[[-2,-59],[-2,-32],[10,0],[43,0],[70,0],[55,26]].map(([x,z],i)=>({type:'manhole',x,z,scale:2,yaw:i*.79})),
 ...[[-49,15,.85],[-55,18,1.1],[-72,7,.95],[-86,-12,1.05],[-57,-46,1],[-65,-50,.8],[-38,-57,.9],[-42,-62,1.12]].map(([x,z,scale],i)=>({type:'stump',x,z,scale,yaw:i*2.39})),
 ...[[-51,21,.86],[-82,5,1],[-60,-48,.92],[-40,-65,.82]].map(([x,z,scale],i)=>({type:'trunk',x,z,scale,yaw:i*1.13+.3})),
 {type:'gate',x:-28,z:7.8,yaw:Math.atan2(1,.65)}
];
async function loadStreetProps(){
 const loader=new THREE.GLTFLoader();
 for(const type of ['broken-bicycle','barrier','manhole','stump','trunk','gate']){
  $('status').textContent='Loading street objects…';
  await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='assets/street/'+type+'.js';s.onload=()=>{s.remove();resolve();};s.onerror=()=>reject(new Error('Missing street asset '+type));document.head.append(s);});
  const data=atob(STREET_PROP_ASSETS[type]),bytes=new Uint8Array(data.length);for(let i=0;i<data.length;i++)bytes[i]=data.charCodeAt(i);delete STREET_PROP_ASSETS[type];
  const source=(await loader.parseAsync(bytes.buffer,'')).scene;
  const bounds=new THREE.Box3().setFromObject(source),center=bounds.getCenter(new THREE.Vector3());
  const root=mergeImported(source);
  // Keep the gate's original hinge centre, not the centre of its opened leaves.
  if(type==='gate')for(const m of root.children){m.geometry.translate(center.x,bounds.min.y,center.z);m.geometry.computeBoundingBox();m.geometry.computeBoundingSphere();}
  for(const mesh of root.children){mesh.material.transparent=false;mesh.material.depthWrite=true;mesh.material.envMapIntensity=.18;mesh.material.roughness=Math.max(.75,mesh.material.roughness);mesh.castShadow=type!=='manhole';}
  streetPropTemplates[type]=root;
 }
}
function streetBounds(g){g.updateMatrixWorld(true);return new THREE.Box3().setFromObject(g);}
function seatStreetProp(g,p){
 const ground=terrainHeightAt(p.x,p.z),b=streetBounds(g);
 g.position.y+=p.type==='manhole'?ground+.009-b.max.y:ground-(p.type==='stump'?.065:p.type==='trunk'?.035:0)-b.min.y;
 g.userData.groundHeight=ground;
}
function buildStreetProps(){
 for(const p of streetPropLayout){
  const g=streetPropTemplates[p.type].clone(true);g.name='street_'+p.type;g.position.set(p.x,0,p.z);g.rotation.y=p.yaw||0;g.scale.setScalar(p.scale||1);scene.add(g);seatStreetProp(g,p);
  g.userData.streetType=p.type;streetPropObjects.push(g);townObjects.push(g);
  if(p.type==='gate')for(const m of g.children)collision(m);else if(p.type!=='manhole')collision(g);
 }
 const gate=streetPropLayout.find(p=>p.type==='gate'),direction=new THREE.Vector3(Math.cos(gate.yaw),0,-Math.sin(gate.yaw));
 for(const side of [-1,1]){
  const center=new THREE.Vector3(gate.x,0,gate.z).addScaledVector(direction,side*(1.55+4));
  const before=colliders.length,g=importedFence(center.x,center.z,8,gate.yaw);
  // Narrow panel colliders follow the fence instead of enclosing a diagonal yard.
  colliders.splice(before);g.position.y=terrainHeightAt(center.x,center.z)-.04;g.updateMatrixWorld(true);
  for(const panel of g.children)collision(panel);
  g.userData.streetType='forest-fence';streetPropFences.push(g);townObjects.push(g);
 }
 // Existing roots must not intersect the new metalwork, logs or stump roots.
 const occupied=[...streetPropObjects.filter(g=>['gate','stump','trunk'].includes(g.userData.streetType)),...streetPropFences].flatMap(g=>g.userData.streetType==='forest-fence'?g.children.map(streetBounds):[streetBounds(g)]);
 for(let i=treeObjects.length-1;i>=0;i--){const g=treeObjects[i],root=g.userData.grounding.rootXZ;
  if(!occupied.some(b=>root[0]>b.min.x-.5&&root[0]<b.max.x+.5&&root[1]>b.min.z-.5&&root[1]<b.max.z+.5))continue;
  const ci=colliders.findIndex(b=>Math.abs((b.min.x+b.max.x)/2-root[0])<.001&&Math.abs((b.min.z+b.max.z)/2-root[1])<.001&&Math.abs(b.max.x-b.min.x-.7)<.001);
  if(ci>=0)colliders.splice(ci,1);scene.remove(g);treeObjects.splice(i,1);townObjects.splice(townObjects.indexOf(g),1);
 }
}
function streetPropDiagnostics(){
 const counts={};for(const g of streetPropObjects)counts[g.userData.streetType]=(counts[g.userData.streetType]||0)+1;
 return {counts,fenceSections:streetPropFences.length,gateOpeningDegrees:100,objects:streetPropObjects.map(g=>{const b=streetBounds(g);return {type:g.userData.streetType,position:g.position.toArray(),bottom:b.min.y,top:b.max.y,ground:g.userData.groundHeight};})};
}
