'use strict';
// BRAIN FOG v0.6.17 — all buildings are licensed imported meshes.
// X east, Z south. Keep asset transforms here so map edits do not affect controls.
const townTemplates={},townObjects=[],treeObjects=[];
const townLayout=[
 {id:'01',x:0,z:-86,width:18,yaw:0},
 {id:'04',x:30,z:-17,width:19,yaw:0},
 {id:'05A',x:54,z:-16,width:19,yaw:0},
 {id:'06',x:104,z:0,width:16,yaw:-Math.PI/2,solid:false},
 {id:'07',x:0,z:29,width:32,yaw:Math.PI},
 {id:'08',x:30,z:16,width:3.6,yaw:Math.PI/2},
 {id:'09',x:-77,z:-28,height:22,yaw:0},
 {id:'T1',x:72,z:-16,width:5.8,yaw:0}
];
const treePositions=[[-23,-84],[-19,-70],[-20,-56],[-21,-42],[-20,-28],[-20,-16],[-54,-9],[-40,-10],[-26,-9],[-55,2],[-54,14],[-41,16],[-27,17],[-31,26],[30,26],[30,38],[32,49],[44,50],[55,50],[66,50],[76,52],[76,44],[76,34],[76,22]];
const lampPositions=[[-8,-68],[-8,-44],[-8,-20],[-15,-9],[14,11],[30,-6],[59,-6],[76,6],[35,34],[70,34]];
const vegetationCounts={baseBorder:0,baseForest:0,border:0,forest:0};
const treeBatches=[];
function batchTreeRendering(){
 // Share draw calls inside fixed world cells. Every light still culls its own shadow
 // frustum: moving the camera cannot remove trees from a different light's shadows.
 const batches=new Map();
 for(const g of treeObjects){g.updateMatrixWorld(true);for(const mesh of g.children){
  if(!mesh.isMesh)continue;const key=[mesh.geometry.uuid,mesh.material.uuid,Math.floor(g.position.x/24),Math.floor(g.position.z/24)].join(':');
  if(!batches.has(key))batches.set(key,{geometry:mesh.geometry,material:mesh.material,matrices:[]});
  batches.get(key).matrices.push(mesh.matrixWorld.clone());
 }g.visible=false;}
 for(const b of batches.values()){
  const mesh=new THREE.InstancedMesh(b.geometry,b.material,b.matrices.length);
  b.matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();
  mesh.castShadow=mesh.receiveShadow=true;mesh.userData.importedAsset=true;mesh.name='tree_cell';scene.add(mesh);treeBatches.push(mesh);
 }
}
function extraTreeAllowed(x,z,roots,obstacles){
 if(x< -93||x>93||z< -101||z>53)return false;
 if(roadRects.some(r=>distanceToRect(x,z,r)<1.3))return false;
 if(Math.hypot(x+77,z+28)<9||Math.hypot(x+40,z-2)<3.5)return false;
 if(x< -30&&Math.abs(z-(x+40)*.65)<4.5)return false;
 if(roots.some(r=>Math.hypot(r[0]-x,r[1]-z)<2.4))return false;
 return !obstacles.some(b=>distanceToRect(x,z,[b.min.x,b.min.z,b.max.x-b.min.x,b.max.z-b.min.z])<1.2);
}
function densifyTrees(){
 // Preserve all original trees/props and their random sequence; add with an independent seed.
 const previousSeed=seed;seed=76150912;
 vegetationCounts.baseBorder=treePositions.length;
 vegetationCounts.baseForest=treeObjects.length-treePositions.length;
 vegetationCounts.border=vegetationCounts.baseBorder;vegetationCounts.forest=vegetationCounts.baseForest;
 const roots=treeObjects.map(g=>g.userData.grounding.rootXZ);
 const obstacles=townObjects.filter(g=>!treeObjects.includes(g)).map(g=>new THREE.Box3().setFromObject(g));
 for(const zone of ['border','forest']){
  const target=vegetationCounts[zone]*(zone==='forest'?3:2);let attempts=0;
  while(vegetationCounts[zone]<target&&attempts++<6000){
   let x,z;
   if(zone==='border'){
    const anchor=treePositions[(vegetationCounts.border-vegetationCounts.baseBorder)%treePositions.length];
    const angle=rr(0,Math.PI*2),radius=rr(3.2,6.5);x=anchor[0]+Math.cos(angle)*radius;z=anchor[1]+Math.sin(angle)*radius;
   }else{x=rr(-91,-31);z=rr(-96,36);}
   if(!extraTreeAllowed(x,z,roots,obstacles))continue;
   const kind=vegetationCounts[zone]%3===0?'OAK1':'X2';
   townTree(kind,x,z,zone==='forest'?rr(18,25):rr(15,21),rr(0,Math.PI*2));
   const g=treeObjects[treeObjects.length-1],root=g.userData.grounding.rootXZ;
   // Root coordinates can differ from canopy-centred model coordinates: validate after anchoring.
   if(!extraTreeAllowed(root[0],root[1],roots,obstacles)){scene.remove(g);treeObjects.pop();townObjects.pop();colliders.pop();continue;}
   g.userData.vegetationZone=zone;roots.push(root);vegetationCounts[zone]++;
  }
  if(vegetationCounts[zone]!==target)throw new Error('Unable to place requested tree density: '+zone);
 }
 seed=previousSeed;
}
function mergeImported(source,filter=()=>true){
 // Offline optimized meshes already share buffers by material. Keep ALL glTF attributes.
 // In particular uv1 is needed by 05A's roughness map and the lighthouse normal map.
 source.updateMatrixWorld(true);const root=new THREE.Group();
 source.traverse(o=>{if(!o.isMesh||!filter(o))return;
  const geo=o.geometry.clone().applyMatrix4(o.matrixWorld);
  if(o.matrixWorld.determinant()<0&&geo.index){for(let i=0;i<geo.index.count;i+=3){const t=geo.index.getX(i);geo.index.setX(i,geo.index.getX(i+2));geo.index.setX(i+2,t);}}
  const mat=o.material.clone();mat.envMapIntensity=.18;
  if(mat.color)mat.color.multiplyScalar(.94);
  if(/foliage|twig/i.test(mat.name)){mat.transparent=false;mat.alphaTest=.42;mat.side=THREE.DoubleSide;mat.shadowSide=THREE.DoubleSide;mat.depthWrite=true;mat.roughness=1;}
  if(mat.emissive)mat.emissiveIntensity=0;
  for(const key of ['map','normalMap','roughnessMap','metalnessMap','aoMap','emissiveMap'])if(mat[key])mat[key].anisotropy=2;
  const mesh=new THREE.Mesh(geo,mat);mesh.name=o.name;mesh.userData.importedAsset=true;mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);
 });
 if(!root.children.length)throw new Error('Empty asset selection');
 const b=new THREE.Box3().setFromObject(root),c=b.getCenter(new THREE.Vector3());
 for(const mesh of root.children){mesh.geometry.translate(-c.x,-b.min.y,-c.z);mesh.geometry.computeBoundingSphere();mesh.geometry.computeBoundingBox();}
 root.userData.size=b.getSize(new THREE.Vector3()).toArray();return root;
}
async function loadTownAssets(){
 const loader=new THREE.GLTFLoader();
 for(const id of ['01','04','05A','05B','06','07','08','09','T1','LAMP','OAK','X2','TORCH']){
  $('status').textContent='Loading town · '+id;
  await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='assets/'+id+'.js';script.onload=()=>{script.remove();resolve();};script.onerror=()=>reject(new Error('Missing asset '+id));document.head.append(script);});
  const str=atob(TOWN_ASSETS[id]);const bytes=new Uint8Array(str.length);for(let i=0;i<str.length;i++)bytes[i]=str.charCodeAt(i);
  const source=(await loader.parseAsync(bytes.buffer,'')).scene;delete TOWN_ASSETS[id];
  if(id==='OAK'){
   for(let variant=0;variant<3;variant++){townTemplates['OAK'+variant]=mergeImported(source,o=>{return o.name.startsWith('oak'+variant);});}
  }else if(id==='05B'){
   townTemplates.BENCH=mergeImported(source,o=>/bench_low/.test(o.name));
   // Only the used bench is shipped, not 38 unused shop textures.
  }else townTemplates[id]=mergeImported(source,o=>!(id==='04'&&/Plane_Ground/.test(o.name)));
  if(id==='07')correctStationNumbers(townTemplates[id]);
 }
 propTemplates.streetLamp=townTemplates.LAMP;propTemplates.torch=townTemplates.TORCH;
}
function correctStationNumbers(root){
 // Reuse the four existing painted digits in the atlas. From the street the facade
 // was 4,3,2,1. Swap digit samples only, keeping the mesh, shutters and PBR maps intact.
 // All four source digit patches use the same local UV orientation.
 for(const mesh of root.children){const material=mesh.material;
  material.onBeforeCompile=shader=>{
   shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
    vec2 gateUV=vMapUv, gatePixel=vMapUv*1024.0;
    if(all(lessThan(abs(gatePixel-vec2(608.0,668.0)),vec2(28.0))))gateUV=(gatePixel-vec2(608.0,668.0)+vec2(800.0,480.0))/1024.0;
    else if(all(lessThan(abs(gatePixel-vec2(800.0,480.0)),vec2(28.0))))gateUV=(gatePixel-vec2(800.0,480.0)+vec2(608.0,668.0))/1024.0;
    else if(all(lessThan(abs(gatePixel-vec2(800.0,668.0)),vec2(28.0))))gateUV=(gatePixel-vec2(800.0,668.0)+vec2(608.0,480.0))/1024.0;
    else if(all(lessThan(abs(gatePixel-vec2(608.0,480.0)),vec2(28.0))))gateUV=(gatePixel-vec2(608.0,480.0)+vec2(800.0,668.0))/1024.0;
    `+THREE.ShaderChunk.map_fragment.replace(/vMapUv/g,'gateUV').replace('diffuseColor *= sampledDiffuseColor;',`
     if(distance(gateUV,vMapUv)>.001){
      vec4 oldPaint=texture2D(map,vMapUv);
      float oldDigit=smoothstep(.50,.75,oldPaint.g/max(.001,oldPaint.r))*smoothstep(.015,.05,oldPaint.g);
      float newDigit=smoothstep(.65,.85,sampledDiffuseColor.g/max(.001,sampledDiffuseColor.r))*smoothstep(.06,.13,sampledDiffuseColor.g);
      vec4 shutter=(texture2D(map,vMapUv+vec2(.04,0.))+texture2D(map,vMapUv-vec2(.04,0.)))*.5;
      sampledDiffuseColor=mix(mix(oldPaint,shutter,oldDigit),sampledDiffuseColor,newDigit);
     }
     diffuseColor *= sampledDiffuseColor;`));
  };material.customProgramCacheKey=()=> 'station-digits-left-to-right-1234';
 }
}
function placeTownAsset(id,x,z,{width,height,yaw=0,solid=true}={}){
 const template=townTemplates[id];if(!template)throw new Error('Missing approved asset '+id);
 const g=template.clone(true),s=template.userData.size,scale=height?height/s[1]:width?width/s[0]:1;
 g.name='town_'+id;g.scale.setScalar(scale);g.position.set(x,0,z);g.rotation.y=yaw;scene.add(g);townObjects.push(g);if(solid)collision(g);return g;
}
function townTree(kind,x,z,height,yaw){
 const g=placeTownAsset(kind,x,z,{height,yaw,solid:false});
 // Anchor to the woody trunk, never to lower foliage cards or the canopy bounds.
 g.updateMatrixWorld(true);const v=new THREE.Vector3(),base=new THREE.Box3();let trunkMin=Infinity;
 for(const mesh of g.children){if(!/bark|trunk/i.test(mesh.material.name))continue;const a=mesh.geometry.attributes.position;for(let i=0;i<a.count;i++){v.fromBufferAttribute(a,i).applyMatrix4(mesh.matrixWorld);trunkMin=Math.min(trunkMin,v.y);}}
 if(!Number.isFinite(trunkMin))throw new Error('Tree has no woody root: '+kind);
 const roots=[];
 for(const mesh of g.children){if(!/bark|trunk/i.test(mesh.material.name))continue;const a=mesh.geometry.attributes.position;for(let i=0;i<a.count;i++){v.fromBufferAttribute(a,i).applyMatrix4(mesh.matrixWorld);if(v.y<trunkMin+.60){base.expandByPoint(v);roots.push(v.clone());}}}
 const center=base.getCenter(new THREE.Vector3()),ground=terrainHeightAt(center.x,center.z);
 // Scanned fir roots contain their own soil skirt. Seat its outer rim, not a stray low vertex.
 const radius=Math.max(...roots.map(v=>Math.hypot(v.x-center.x,v.z-center.z)));
 const rim=roots.filter(v=>Math.hypot(v.x-center.x,v.z-center.z)>radius*.72).map(v=>v.y).sort((a,b)=>a-b);
 const contact=rim.length?rim[Math.floor((rim.length-1)*.95)]:trunkMin;
 const shift=ground-.075-contact;g.position.y+=shift;g.updateMatrixWorld(true);
 g.userData.grounding={trunkBefore:trunkMin,contactBefore:contact,ground,shift,rootY:trunkMin+shift,gap:contact+shift-ground,lowestRootGap:trunkMin+shift-ground,rootXZ:[center.x,center.z]};
 colliders.push(new THREE.Box3(new THREE.Vector3(center.x-.35,ground,center.z-.35),new THREE.Vector3(center.x+.35,ground+height*.65,center.z+.35)));treeObjects.push(g);
}
function buildTown(){
 seed=76061; // stable layout, independent of weather texture generation
 // One continuous ground surface; road edges blend into soil in world coordinates.
 buildTerrain();
 for(const p of townLayout)placeTownAsset(p.id,p.x,p.z,p);
 // The approved alternative shop supplies this real bench model.
 placeTownAsset('BENCH',-40,2,{height:.9,yaw:Math.PI/2});
 for(let i=0;i<treePositions.length;i++){const [x,z]=treePositions[i];townTree(i%3===0?'X2':'OAK'+(i%3),x,z,i%3===0?rr(19,24):rr(15,20),rr(0,6.28));}
 // Dense forest behind the grove, preserving the path and lighthouse clearing.
 for(let i=0;i<55;i++){let x=rr(-91,-31),z=rr(-96,36);if(Math.hypot(x+77,z+28)<8||Math.abs(z-(x+40)*.65)<4)continue;townTree(i%3?'X2':'OAK'+i%3,x,z,rr(18,25),rr(0,6.28));}
 for(let i=0;i<lampPositions.length;i++){let [x,z]=lampPositions[i];streetLamp(x,z,rr(-.008,.008));}
 // Retain the already licensed Poly Haven cars, refuse, fences, and hand props.
 for(const x of [42,48,59,65])car(x,31,rr(-.035,.035));
 for(const [x,z] of [[24,-9],[42,-10],[65,-9],[32,18],[-7,17]]){putProp('bin',x,0,z,rr(0,6.28),.9);putProp('bag',x+.8,0,z+.4,rr(0,6.28),.5);}
 for(const [x,z] of [[79,-10],[79,9],[34,20]])putProp('carton',x,0,z,.4,.5,false);
 importedFence(82,30,22,Math.PI/2);importedFence(52,44,30,0);
 const paint=new THREE.MeshStandardMaterial({color:0xa5a28c,roughness:.95,transparent:true,opacity:.24});
 for(let z=-75;z<-13;z+=6)box(scene,.12,.003,2.4,-2,.052,z,paint);
 for(let x=21;x<76;x+=6)box(scene,2.4,.003,.12,x,.052,0,paint);
 for(const x of [39,45,51,57,63,69])box(scene,.09,.003,5.5,x,.052,31,paint);
 preparePuddles();
 buildStreetProps();densifyTrees();fillForestGaps();prepareRoadsideBoxes();
 clearCornFieldTrees();
 batchTreeRendering();
 // Physical perimeter: no visible placeholder walls.
 for(const [x,z,w,d] of [[-96,-25,1,160],[96,-25,1,160],[0,-105,194,1],[0,55,194,1]])colliders.push(new THREE.Box3(new THREE.Vector3(x-w/2,-1,z-d/2),new THREE.Vector3(x+w/2,20,z+d/2)));
}
