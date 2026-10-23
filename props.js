'use strict';
// Imported Poly Haven street props, separate from the approved town buildings.
// Self-contained glTF documents preserve original geometry, UVs and PBR maps.
const propTemplates={},propInstances=[];
async function loadProps(){
 const loader=new THREE.GLTFLoader();
 const scenes={};
 for(const [key,data] of Object.entries(MODEL_ASSETS)){
  $('status').textContent='Loading street objects…';
  scenes[key]=(await loader.parseAsync(JSON.stringify(data), '')).scene;
 }
 function select(key,names){
  const g=new THREE.Group(),source=scenes[key];
  for(const name of names){const found=source.getObjectByName(name);if(!found)throw new Error('Missing asset part: '+name);g.add(found.clone(true));}
  g.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(g),center=b.getCenter(new THREE.Vector3());
  for(const c of g.children){c.position.x-=center.x;c.position.y-=b.min.y;c.position.z-=center.z;}
  g.traverse(o=>{if(!o.isMesh)return;o.userData.importedAsset=true;o.castShadow=o.receiveShadow=true;
   const prepare=m=>{m=m.clone();m.envMapIntensity=.4;if(m.color)m.color.multiply(new THREE.Color(.85,.88,.86));return m;};
   o.material=Array.isArray(o.material)?o.material.map(prepare):prepare(o.material);
  });g.updateMatrixWorld(true);g.userData.size=new THREE.Box3().setFromObject(g).getSize(new THREE.Vector3()).toArray();return g;
 }
 for(const [alias,key] of Object.entries({gloves:'garden_gloves_01',carton:'cardboard_box_01'}))propTemplates[alias]=select(key,scenes[key].children.map(o=>o.name));
 propTemplates.coveredCar=select('covered_car',['covered_car','covered_car_wheel_01','covered_car_wheel_02','covered_car_wheel_03','covered_car_wheel_04']);
 propTemplates.bin=select('metal_trash_can',['metal_trash_can_rust','metal_trash_can_rust_handle_left','metal_trash_can_rust_handle_right','metal_trash_can_rust_lid']);
 propTemplates.bag=select('trashbag',['trashbag']);
 propTemplates.fence=select('modular_chainlink_fence',['modular_chainlink_fence_double']);
 propTemplates.post=select('modular_chainlink_fence',['modular_chainlink_fence_post']);

}
function putProp(key,x,y,z,angle=0,scale=1,solid=true){const g=propTemplates[key].clone(true);g.name='asset_'+key;g.position.set(x,y,z);g.rotation.y=angle;if(Array.isArray(scale))g.scale.set(...scale);else g.scale.setScalar(scale);scene.add(g);if(solid)collision(g);propInstances.push(g);return g;}
function importedFence(x,z,len,angle){
 const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=angle;scene.add(g);
 const count=Math.ceil(len/1.85),step=len/count,panelSize=propTemplates.fence.userData.size;
 for(let i=0;i<count;i++){const panel=propTemplates.fence.clone(true);panel.scale.set((step-.10)/panelSize[0],.8,.8);panel.position.set(-len/2+step*(i+.5),.10,0);g.add(panel);}
 for(let i=0;i<=count;i++){const post=propTemplates.post.clone(true);post.scale.setScalar(.8);post.position.set(-len/2+i*step,0,0);g.add(post);}
 collision(g);g.name='asset_fence';propInstances.push(g);return g;
}
