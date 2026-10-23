'use strict';
// BRAIN FOG v0.6.9 — all buildings are licensed imported meshes.
// X east, Z south. Keep asset transforms here so map edits do not affect controls.
const townTemplates={},townObjects=[],treeObjects=[];
const townLayout=[
 {id:'01',x:0,z:-86,width:18,yaw:0},
 {id:'03',x:15,z:-34,height:8.3,yaw:-Math.PI/2},
 {id:'04',x:30,z:-17,width:19,yaw:0},
 {id:'06',x:89,z:-3,width:16,yaw:0},
 {id:'07',x:0,z:29,width:32,yaw:Math.PI},
 {id:'08',x:30,z:16,width:3.6,yaw:Math.PI/2},
 {id:'09',x:-77,z:-28,height:22,yaw:0},
 {id:'T1',x:72,z:-16,width:5.8,yaw:0}
];
const treePositions=[[-23,-84],[-19,-70],[-20,-56],[-21,-42],[-20,-28],[-20,-16],[-54,-9],[-40,-10],[-26,-9],[-55,2],[-54,14],[-41,16],[-27,17],[-31,26],[30,26],[30,38],[32,49],[44,50],[55,50],[66,50],[76,52],[76,44],[76,34],[76,22]];
const lampPositions=[[-8,-68],[-8,-44],[-8,-20],[-15,-9],[14,11],[30,-6],[59,-6],[76,6],[35,34],[70,34]];
function mergeImported(source,filter=()=>true){
 // Offline optimized meshes already share buffers by material. Keep ALL glTF attributes.
 // Preserve secondary UVs required by imported PBR maps, including the lighthouse normal/roughness setup.
 source.updateMatrixWorld(true);const root=new THREE.Group();
 source.traverse(o=>{if(!o.isMesh||!filter(o))return;
  const geo=o.geometry.clone().applyMatrix4(o.matrixWorld);
  if(o.matrixWorld.determinant()<0&&geo.index){for(let i=0;i<geo.index.count;i+=3){const t=geo.index.getX(i);geo.index.setX(i,geo.index.getX(i+2));geo.index.setX(i+2,t);}}
  const mat=o.material.clone();mat.envMapIntensity=.18;
  if(mat.color)mat.color.multiplyScalar(.94);
  if(/foliage|twig/i.test(mat.name)){mat.transparent=false;mat.alphaTest=.35;mat.side=THREE.DoubleSide;mat.depthWrite=true;mat.roughness=1;}
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
 for(const id of ['01','03','04','05B','06','07','08','09','T1','LAMP','OAK','X2','TORCH']){
  $('status').textContent='Loading town · '+id;
  await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='assets/'+id+'.js';script.onload=()=>{script.remove();resolve();};script.onerror=()=>reject(new Error('Missing asset '+id));document.head.append(script);});
  if(id==='04'){for(const part of ['01','02','03','04','05']){await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='assets/04-parts/04-'+part+'.js';script.onload=()=>{script.remove();resolve();};script.onerror=()=>reject(new Error('Missing asset 04 part '+part));document.head.append(script);});}}
  const str=atob(TOWN_ASSETS[id]);const bytes=new Uint8Array(str.length);for(let i=0;i<str.length;i++)bytes[i]=str.charCodeAt(i);
  const source=(await loader.parseAsync(bytes.buffer,'')).scene;delete TOWN_ASSETS[id];
  if(id==='OAK'){
   for(let variant=0;variant<3;variant++){townTemplates['OAK'+variant]=mergeImported(source,o=>{return o.name.startsWith('oak'+variant);});}
  }else if(id==='05B'){
   townTemplates.BENCH=mergeImported(source,o=>/bench_low/.test(o.name));
   // Only the used bench is shipped, not 38 unused shop textures.
  }else townTemplates[id]=mergeImported(source,o=>!(id==='04'&&/Plane_Ground/.test(o.name)));
 }
 propTemplates.streetLamp=townTemplates.LAMP;propTemplates.torch=townTemplates.TORCH;
}
function placeTownAsset(id,x,z,{width,height,yaw=0,solid=true}={}){
 const template=townTemplates[id];if(!template)throw new Error('Missing approved asset '+id);
 const g=template.clone(true),s=template.userData.size,scale=height?height/s[1]:width?width/s[0]:1;
 g.name='town_'+id;g.scale.setScalar(scale);g.position.set(x,0,z);g.rotation.y=yaw;scene.add(g);townObjects.push(g);if(solid)collision(g);return g;
}
function townTree(kind,x,z,height,yaw){
 const g=placeTownAsset(kind,x,z,{height,yaw,solid:false});
 // Canopies do not block the player; only the trunk has a collision volume.
 const base=new THREE.Box3();const v=new THREE.Vector3();
 for(const mesh of g.children){if(!/bark|trunk/.test(mesh.material.name))continue;const a=mesh.geometry.attributes.position;for(let i=0;i<a.count;i++){v.fromBufferAttribute(a,i);if(v.y<townTemplates[kind].userData.size[1]*.025)base.expandByPoint(v);}}
 const center=base.isEmpty()?new THREE.Vector3():base.getCenter(new THREE.Vector3());g.updateMatrixWorld(true);center.applyMatrix4(g.matrixWorld);
 colliders.push(new THREE.Box3(new THREE.Vector3(center.x-.35,0,center.z-.35),new THREE.Vector3(center.x+.35,height*.65,center.z+.35)));treeObjects.push(g);
}
function buildTown(){
 seed=76061; // stable layout, independent of weather texture generation
 const soil=materials.asphalt.clone();soil.color.set(0x3c433b);soil.roughness=1;soil.metalness=0;
 wall(scene,190,.12,158,0,-.06,-25,soil,false); // common ground plane y=0
 const asphalt=materials.asphalt;asphalt.color.set(0x747a75);asphalt.roughness=.91;asphalt.metalness=.02;asphalt.envMapIntensity=.12;
 // Coplanar junction edges meet instead of overlapping. Only rare puddles are glossy.
 wall(scene,36,.04,28,0,.02,0,asphalt,false);
 wall(scene,8,.04,64,-2,.02,-46,asphalt,false);
 wall(scene,61,.04,8,48.5,.02,0,asphalt,false);
 wall(scene,32,.04,29,53,.02,27,asphalt,false);
 wall(scene,12,.04,8.5,53,.02,8.25,asphalt,false);
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
 for(let z=-74;z<-14;z+=5){frostPatch(scene,.7,rr(.8,2),-6,.055,z,-Math.PI/2);frostPatch(scene,.7,rr(.8,2),2,.055,z+2,-Math.PI/2);}
 for(let x=22;x<78;x+=5){frostPatch(scene,rr(.8,2),.7,x,.055,3.8,-Math.PI/2);frostPatch(scene,rr(.8,2),.7,x+2,.055,-3.8,-Math.PI/2);}
 for(const [x,z,w,d] of [[2,3,2.5,1.3],[-3,-33,1.2,2.1],[35,1,2.6,1.1],[64,-1,1.8,.9],[51,21,2,1.4]])puddle(x,z,w,d);
 // Physical perimeter: no visible placeholder walls.
 for(const [x,z,w,d] of [[-96,-25,1,160],[96,-25,1,160],[0,-105,194,1],[0,55,194,1]])colliders.push(new THREE.Box3(new THREE.Vector3(x-w/2,-1,z-d/2),new THREE.Vector3(x+w/2,20,z+d/2)));
}
