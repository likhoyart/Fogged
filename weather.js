'use strict';
// Weather is driven by game time. One physical beacon light, one shadow map;
// its matching fog cone uses the SAME origin, direction and shadow projection.
let beaconLight,beaconLens,rainLines,rainGlassTexture;
const beaconOrigin=new THREE.Vector3(),beaconDirection=new THREE.Vector3(1,-.04,0).normalize();
const beaconMatrix=new THREE.Matrix4(),rainDrops=[],glassDrops=[];
const glassSize=256,glassPixels=new Uint8Array(glassSize*glassSize*4);
let glassTick=0,weatherTime=0,stormDelay=18,stormAge=10,thunderDelay=-1;
function prepareWeather(){
 const tower=townObjects.find(o=>o.name==='town_09');
 if(!tower)throw new Error('Lighthouse model is missing');
 const bounds=new THREE.Box3().setFromObject(tower);bounds.getCenter(beaconOrigin);beaconOrigin.y=bounds.max.y-2.0;
 beaconLight=new THREE.SpotLight(0xffd39b,109000,210,.1475,.20,2);
 beaconLight.position.copy(beaconOrigin);beaconLight.castShadow=true;
 beaconLight.shadow.mapSize.set(1024,1024);beaconLight.shadow.camera.near=.5;beaconLight.shadow.camera.far=210;
 beaconLight.shadow.bias=-.00015;beaconLight.shadow.normalBias=.07;
 scene.add(beaconLight,beaconLight.target);
 // Lens is an emissive optical element inside the imported lantern room.
 beaconLens=new THREE.Mesh(new THREE.SphereGeometry(.20,12,8),new THREE.MeshBasicMaterial({color:0xfff1c8,toneMapped:false}));
 beaconLens.position.copy(beaconOrigin);beaconLens.userData.atmosphere=true;beaconLens.material.color.setRGB(4.0,2.65,1.5);scene.add(beaconLens);
 // The lighthouse itself must not occlude its internal source with opaque glass.
 tower.traverse(o=>{if(o.isMesh)o.castShadow=false;});
 const positions=new Float32Array(320*6);
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
 const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{flash:{value:0}},vertexShader:`varying float fade;void main(){vec4 p=modelViewMatrix*vec4(position,1.);fade=(1.-smoothstep(6.,16.,length(p.xyz)))*.14;gl_Position=projectionMatrix*p;}`,fragmentShader:`uniform float flash;varying float fade;void main(){gl_FragColor=vec4(vec3(.38,.43,.45)+flash*.5,fade);}`});
 rainLines=new THREE.LineSegments(geometry,mat);rainLines.frustumCulled=false;rainLines.userData.atmosphere=true;scene.add(rainLines);
 for(let i=0;i<320;i++)rainDrops.push({x:Math.random()*28-14,y:Math.random()*13,z:Math.random()*28-14,speed:7+Math.random()*3,len:.17+Math.random()*.17});
 for(let i=0;i<10;i++)glassDrops.push({x:Math.random(),y:Math.random(),r:.0048+Math.random()*.0072,speed:.006+Math.random()*.018,phase:Math.random()*6.28});
 rainGlassTexture=new THREE.DataTexture(glassPixels,glassSize,glassSize,THREE.RGBAFormat);rainGlassTexture.minFilter=rainGlassTexture.magFilter=THREE.LinearFilter;rainGlassTexture.generateMipmaps=false;
 post.uniforms.rainGlass.value=rainGlassTexture;updateRainGlass(0);animateBeacon(0);
}
function animateBeacon(dt){
 if(!beaconLight)return;weatherTime+=dt;
 // A full revolution every 30 seconds. Beam crosses the town once per revolution.
 const angle=weatherTime*Math.PI*2/30;
 beaconDirection.set(Math.cos(angle),-.04,Math.sin(angle)).normalize();
 beaconLight.target.position.copy(beaconOrigin).addScaledVector(beaconDirection,150);
 beaconLight.intensity=109000;
}
function syncBeaconShadow(){
 if(!beaconLight)return;
 post.uniforms.beaconShadow.value=beaconLight.shadow.map?.texture||null;
 beaconMatrix.copy(beaconLight.shadow.matrix);
 post.uniforms.beaconReady.value=beaconLight.shadow.map?1:0;
}
function updateRainGlass(dt){
 // Small CPU normal atlas at 15 Hz; only one atlas sample per screen pixel.
 for(let i=0;i<glassPixels.length;i+=4){glassPixels[i]=glassPixels[i+1]=128;glassPixels[i+2]=0;glassPixels[i+3]=255;}
 for(const drop of glassDrops){drop.y-=drop.speed*dt;if(drop.y<-.06){drop.y=1.03;drop.x=.04+Math.random()*.92;}const cx=(drop.x+Math.sin(weatherTime*.6+drop.phase)*.001)*glassSize,cy=drop.y*glassSize;
  const rx=Math.max(1.1,drop.r*glassSize),ry=rx*1.65;
  for(let y=Math.max(0,Math.floor(cy-ry));y<Math.min(glassSize,cy+ry*4);y++)for(let x=Math.max(0,Math.floor(cx-rx));x<Math.min(glassSize,cx+rx);x++){
   const nx=(x-cx)/rx,ny=(y-cy)/ry,r2=nx*nx+ny*ny;let strength=r2<1?Math.sqrt(1-r2):0;
   if(ny>0&&Math.abs(nx)<.22)strength=Math.max(strength,.12*(1-ny/4));if(strength<=0)continue;
   const p=(y*glassSize+x)*4;glassPixels[p]=128+nx*strength*105;glassPixels[p+1]=128+Math.min(1,ny)*strength*90;glassPixels[p+2]=Math.min(255,strength*125);
  }
 }
 rainGlassTexture.needsUpdate=true;
}
function animateRain(dt,flash){
 if(!rainLines)return;
 const a=rainLines.geometry.attributes.position;
 for(let i=0;i<rainDrops.length;i++){const d=rainDrops[i];d.y-=d.speed*dt;d.x+=dt*.25;if(d.y<0){d.y=12+Math.random();d.x=Math.random()*28-14;d.z=Math.random()*28-14;}
  const x=camera.position.x+d.x,z=camera.position.z+d.z,y=d.y;
  // Do not draw rain through solid roofs, interiors or the player's hand.
  const hidden=colliders.some(b=>x>b.min.x&&x<b.max.x&&z>b.min.z&&z<b.max.z&&y<b.max.y&&b.max.y>2);
  a.setXYZ(i*2,x,hidden?-10:y,z);a.setXYZ(i*2+1,x+.024,hidden?-10:y+d.len,z);
 }
 a.needsUpdate=true;rainLines.material.uniforms.flash.value=flash;
 glassTick+=dt;if(glassTick>=1/15){updateRainGlass(glassTick);glassTick=0;}
}
function animateStorm(dt){
 if(!$('lightning').checked){stormAge=10;thunderDelay=-1;post.uniforms.flash.value=0;skyKey.intensity=.32;skyLight.intensity=.14;if(nightSky)nightSky.material.uniforms.lightning.value=0;return 0;}
 if(dt>0){stormDelay-=dt;stormAge+=dt;
  if(stormDelay<=0){stormAge=0;stormDelay=40+Math.random()*50;thunderDelay=1.4+Math.random()*2.0;}
  if(thunderDelay>=0){thunderDelay-=dt;if(thunderDelay<0&&audio)audio.thunder();}
 }
 // Two rapid, bright pulses. The full event is roughly twice as fast as the previous long flash.
 const first=stormAge<.11?Math.exp(-stormAge*26):0;
 const second=stormAge>=.115&&stormAge<.25?1.18*Math.exp(-(stormAge-.115)*28):0;
 const flash=Math.min(1.35,first+second);
 skyKey.intensity=.32+flash*6.4;skyLight.intensity=.14+flash*1.25;post.uniforms.flash.value=flash;
 if(nightSky)nightSky.material.uniforms.lightning.value=flash;return flash;
}
