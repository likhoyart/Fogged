'use strict';
// Fixed world-space lights and targets. No camera-dependent pool or volumetric substitution.
const streetLightSources=[],streetLightPool=[];
const streetFogPositions=Array.from({length:10},()=>new THREE.Vector3(0,-1000,0));
function prepareStreetLights(){}
function streetLamp(x,z,lean){
 const scale=7.2/propTemplates.streetLamp.userData.size[1];const g=putProp('streetLamp',x+1.60,0,z,0,scale,false);g.rotation.z=lean;
 g.updateMatrixWorld(true);const bulbMaterials=[];
 g.traverse(o=>{if(!o.isMesh)return;const clone=m=>{m=m.clone();if(m.emissiveMap){m.emissive.set(0xffdfab);m.emissiveIntensity=2.2;bulbMaterials.push(m);}return m;};o.material=Array.isArray(o.material)?o.material.map(clone):clone(o.material);});
 const position=new THREE.Vector3(x+2.9,6.9,z);
 const light=new THREE.PointLight(0xffdfad,245,16,2);light.position.copy(position);
 // Diffuse street illumination has no spotlight cone; the flashlight and beacon retain shadows.
 light.castShadow=false;
 streetFogPositions[streetLightSources.length].copy(position);
 scene.add(light);streetLightPool.push(light);
 streetLightSources.push({position,light,bulbMaterials,base:245,power:245});
 colliders.push(new THREE.Box3(new THREE.Vector3(x-.14,0,z-.14),new THREE.Vector3(x+.14,4,z+.14)));
}
function animateStreetLights(){ /* Street lights stay constant, including during movement and pause. */ }
