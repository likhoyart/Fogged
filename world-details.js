'use strict';
const roadsideBoxes=[],forestCoverage=[];
function fillForestGaps(){
 const savedSeed=seed;seed=190913;const roots=treeObjects.map(g=>g.userData.grounding.rootXZ),obstacles=townObjects.filter(g=>!treeObjects.includes(g)).map(g=>new THREE.Box3().setFromObject(g));vegetationCounts.infill=0;
 // Compare each free cell to the same target density. Existing lighthouse forest stays intact.
 for(let z=-101;z<53;z+=16)for(let x=-93;x<93;x+=16){const width=Math.min(16,93-x),depth=Math.min(16,53-z);let free=0;
  for(let j=0;j<8;j++)for(let i=0;i<8;i++)if(extraTreeAllowed(x+(i+.5)*width/8,z+(j+.5)*depth/8,[],obstacles))free++;
  const targetCount=Math.round(width*depth*.025*free/64);let count=roots.filter(r=>r[0]>=x&&r[0]<x+width&&r[1]>=z&&r[1]<z+depth).length;
  for(let attempt=0;count<targetCount&&attempt<150;attempt++){
   const tx=rr(x+.4,x+width-.4),tz=rr(z+.4,z+depth-.4);if(!extraTreeAllowed(tx,tz,roots,obstacles))continue;
   townTree(vegetationCounts.infill%3===0?'OAK1':'X2',tx,tz,rr(18,25),rr(0,Math.PI*2));const g=treeObjects[treeObjects.length-1],r=g.userData.grounding.rootXZ;
   if(!extraTreeAllowed(r[0],r[1],roots,obstacles)||r[0]<x||r[0]>=x+width||r[1]<z||r[1]>=z+depth){scene.remove(g);treeObjects.pop();townObjects.pop();colliders.pop();continue;}
   roots.push(r);g.userData.vegetationZone='infill';vegetationCounts.infill++;count++;
  }forestCoverage.push({x,z,free:free/64,target:targetCount,count});
 }
 vegetationCounts.total=treeObjects.length;seed=savedSeed;
}
function cardboardMaterial(){
 const material=new THREE.MeshStandardMaterial({color:0x857059,roughness:1,metalness:0,side:THREE.DoubleSide});
 material.onBeforeCompile=s=>{s.vertexShader='varying vec3 cardPosition;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n cardPosition=(modelMatrix*vec4(position,1.)).xyz;');s.fragmentShader='varying vec3 cardPosition;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 float fibre=fract(sin(dot(floor(cardPosition.xz*950.+cardPosition.y*770.),vec2(12.9898,78.233)))*43758.5453);
 float damp=.86+.14*sin(cardPosition.x*6.2+cardPosition.z*7.8);diffuseColor.rgb*=damp*(.92+.12*fibre);`);};return material;
}
function createEmptyBox(x,z,w,h,d,angle,material){
 const root=group(x,terrainHeightAt(x,z)+.018,z,angle),t=.012;
 box(root,w,t,d,0,t/2,0,material);box(root,w,h,t,0,h/2,-d/2,material);box(root,w,h,t,0,h/2,d/2,material);box(root,t,h,d,-w/2,h/2,0,material);box(root,t,h,d,w/2,h/2,0,material);
 // Four short bent flaps: the centre remains open and the interior bottom is visible.
 for(const side of [-1,1]){const flap=box(root,w,d*.34,t,0,h,side*d/2,material);flap.geometry=boxGeo.clone();flap.geometry.translate(0,.5,0);flap.rotation.x=side*rr(.8,1.55);}
 for(const side of [-1,1]){const flap=box(root,t,w*.30,d,side*w/2,h,0,material);flap.geometry=boxGeo.clone();flap.geometry.translate(0,.5,0);flap.rotation.z=-side*rr(.75,1.5);}
 root.name='empty_cardboard_box';collision(root);roadsideBoxes.push({x,z,w,h,d,angle,open:true});return root;
}
function prepareRoadsideBoxes(){
 const savedSeed=seed;seed=190919;const material=cardboardMaterial(),obstacles=townObjects.filter(g=>!treeObjects.includes(g)).map(g=>new THREE.Box3().setFromObject(g));
 for(let attempt=0;roadsideBoxes.length<28&&attempt<6000;attempt++){
  const r=roadRects[Math.floor(rnd()*roadRects.length)],side=Math.floor(rnd()*4),margin=rr(.8,2.3);let x,z;
  if(side<2){x=rr(r[0]+1,r[0]+r[2]-1);z=r[1]+(side?r[3]+margin:-margin);}else{z=rr(r[1]+1,r[1]+r[3]-1);x=r[0]+(side===3?r[2]+margin:-margin);}
  if(roadSignedDistance(x,z)<.65||roadSignedDistance(x,z)>2.8||Math.hypot(x-9,z-11)<5)continue;
  if(obstacles.some(b=>distanceToRect(x,z,[b.min.x,b.min.z,b.max.x-b.min.x,b.max.z-b.min.z])<1)||treeObjects.some(g=>Math.hypot(g.userData.grounding.rootXZ[0]-x,g.userData.grounding.rootXZ[1]-z)<1.1)||roadsideBoxes.some(b=>Math.hypot(b.x-x,b.z-z)<1.5))continue;
  const w=rr(.32,.82);createEmptyBox(x,z,w,w*rr(.55,.9),w*rr(.65,1.15),rr(-Math.PI,Math.PI),material);
 }seed=savedSeed;
}
