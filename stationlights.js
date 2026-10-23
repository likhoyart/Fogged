'use strict';
// Four garage bays located from the fire-station mesh/UV layout.
// Exterior fixtures are compact LED bars: visible source, soft downward spill, no lantern silhouette.
const stationDoorCenters=[-11.0191345,-6.260729,-1.502324,3.256081];
const stationLights=[];
let stationFlickerFrames=0,stationMinimumPower=1,stationSyncError=0;
function stationElectricalPower(age){
 if(age<0||age>=ELECTRICAL_EFFECT.duration)return 1;
 const i=Math.max(0,Math.min(ELECTRICAL_EFFECT.envelope.length-1,Math.floor(age*ELECTRICAL_EFFECT.envelopeRate)));
 return 1-.94*ELECTRICAL_EFFECT.envelope[i];
}
function prepareStationLights(){
 const housing=new THREE.MeshStandardMaterial({color:0x2e302f,roughness:.62,metalness:.78,envMapIntensity:.35});
 const glowCanvas=document.createElement('canvas');glowCanvas.width=128;glowCanvas.height=32;const gc=glowCanvas.getContext('2d');
 const grad=gc.createRadialGradient(64,16,1,64,16,64);grad.addColorStop(0,'rgba(255,216,169,.68)');grad.addColorStop(.28,'rgba(255,196,132,.20)');grad.addColorStop(1,'rgba(255,190,120,0)');gc.fillStyle=grad;gc.fillRect(0,0,128,32);const glowMap=new THREE.CanvasTexture(glowCanvas);
 for(let i=0;i<stationDoorCenters.length;i++){
  const x=stationDoorCenters[i],group=Math.floor(i/2);const fixture=new THREE.Group();fixture.name='station_gate_led_'+(i+1);fixture.position.set(x,5.02,16.98);fixture.userData.atmosphere=true;
  const body=new THREE.Mesh(new THREE.BoxGeometry(1.92,.12,.14),housing);fixture.add(body);
  const stripMaterial=new THREE.MeshBasicMaterial({color:0xffd2a2,toneMapped:false});
  const strip=new THREE.Mesh(new THREE.BoxGeometry(1.78,.045,.075),stripMaterial);strip.position.set(0,-.075,-.055);fixture.add(strip);
  const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowMap,transparent:true,opacity:.18,depthWrite:false,depthTest:true,toneMapped:false}));glow.position.set(0,-.12,-.11);glow.scale.set(2.25,.46,1);fixture.add(glow);
  fixture.traverse(o=>{if(o.isMesh){o.userData.atmosphere=true;o.castShadow=false;o.receiveShadow=false;}});scene.add(fixture);
  // ~3100 K, broad penumbra, aimed mostly down and slightly into the recessed garage doors.
  const light=new THREE.SpotLight(0xffc996,235,8.2,.60,.86,2);light.position.set(x,4.90,16.72);light.castShadow=false;
  light.target.position.set(x,1.35,17.72);scene.add(light,light.target);
  stationLights.push({fixture,light,stripMaterial,glow,base:235,group,power:1});
 }
 animateStationLights();
}
function animateStationLights(){
 // Two neighbouring pairs follow the flashlight's electrical waveform with a small stagger.
 // This keeps the same irregular flicker language without making all four bars blink as one sign.
 const delays=[0,.14];
 for(const s of stationLights){
  const age=flashlightAge<0?-1:flashlightAge-delays[s.group];
  const power=stationElectricalPower(age);s.power=power;s.light.intensity=s.base*power;
  s.stripMaterial.color.setRGB(2.10*power,1.48*power,.91*power);s.glow.material.opacity=.18*power;
  const expected=stationElectricalPower(age);stationSyncError=Math.max(stationSyncError,Math.abs(s.light.intensity/s.base-expected));
 }
 if(debug&&active&&flashlightAge>=0){stationFlickerFrames++;stationMinimumPower=Math.min(stationMinimumPower,...stationLights.map(s=>s.power));}
}
