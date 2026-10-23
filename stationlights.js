'use strict';
// Four garage bays located from the fire-station mesh/UV layout.
// Compact LED bars: visible source + wall wash only BELOW the fixture.
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
 // One-sided-looking vertical wash: brightest immediately below the LED, fading downward.
 const washCanvas=document.createElement('canvas');washCanvas.width=96;washCanvas.height=192;const wc=washCanvas.getContext('2d');
 const vg=wc.createLinearGradient(0,0,0,192);vg.addColorStop(0,'rgba(255,219,178,.48)');vg.addColorStop(.18,'rgba(255,205,153,.25)');vg.addColorStop(.62,'rgba(255,192,126,.07)');vg.addColorStop(1,'rgba(255,185,112,0)');wc.fillStyle=vg;wc.fillRect(0,0,96,192);
 const washMap=new THREE.CanvasTexture(washCanvas);
 for(let i=0;i<stationDoorCenters.length;i++){
  const x=stationDoorCenters[i],group=Math.floor(i/2);const fixture=new THREE.Group();fixture.name='station_gate_led_'+(i+1);fixture.position.set(x,5.02,16.98);fixture.userData.atmosphere=true;
  // About 44% of one garage-bay width.
  const body=new THREE.Mesh(new THREE.BoxGeometry(2.22,.12,.14),housing);fixture.add(body);
  const stripMaterial=new THREE.MeshBasicMaterial({color:0xffd2a2,toneMapped:false});
  const strip=new THREE.Mesh(new THREE.BoxGeometry(2.10,.045,.075),stripMaterial);strip.position.set(0,-.075,-.055);fixture.add(strip);
  const washMaterial=new THREE.MeshBasicMaterial({map:washMap,transparent:true,opacity:.16,depthWrite:false,depthTest:true,toneMapped:false,side:THREE.DoubleSide});
  const glow=new THREE.Mesh(new THREE.PlaneGeometry(2.28,1.55),washMaterial);glow.position.set(0,-.86,-.075);fixture.add(glow);
  fixture.traverse(o=>{if(o.isMesh){o.userData.atmosphere=true;o.castShadow=false;o.receiveShadow=false;}});scene.add(fixture);
  // Warm LED spill: target is well below the source, so the upper facade receives no cone light.
  const light=new THREE.SpotLight(0xffc996,235,8.2,.48,.88,2);light.position.set(x,4.90,16.72);light.castShadow=false;
  light.target.position.set(x,1.15,17.28);scene.add(light,light.target);
  stationLights.push({fixture,light,stripMaterial,glow,base:235,group,power:1});
 }
 animateStationLights();
}
function animateStationLights(){
 // Two neighbouring groups follow the flashlight electrical waveform with a small stagger.
 const delays=[0,.14];
 for(const s of stationLights){
  const age=flashlightAge<0?-1:flashlightAge-delays[s.group];
  const power=stationElectricalPower(age);s.power=power;s.light.intensity=s.base*power;
  s.stripMaterial.color.setRGB(2.10*power,1.48*power,.91*power);s.glow.material.opacity=.16*power;
  const expected=stationElectricalPower(age);stationSyncError=Math.max(stationSyncError,Math.abs(s.light.intensity/s.base-expected));
 }
 if(debug&&active&&flashlightAge>=0){stationFlickerFrames++;stationMinimumPower=Math.min(stationMinimumPower,...stationLights.map(s=>s.power));}
}
