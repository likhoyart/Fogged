'use strict';
// FOGGED v0.6.31 / Ash Street. Three.js r160.1, world units = metres.
// Imported assets: Sketchfab CC BY 4.0 and Poly Haven CC0. See CREDITS.md.
const $=id=>document.getElementById(id),clamp=THREE.MathUtils.clamp;
let seed=48196;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296},rr=(a,b)=>a+(b-a)*rnd();
const scene=new THREE.Scene();scene.background=new THREE.Color(0x111b22);scene.fog=new THREE.Fog(0x111b22,1000,2000);
const camera=new THREE.PerspectiveCamera(65,innerWidth/innerHeight,.07,120);camera.position.set(51,1.7,18);camera.rotation.order='YXZ';scene.add(camera);
const renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;document.body.prepend(renderer.domElement);
const skyLight=new THREE.HemisphereLight(0x9cbbcc,0x11171b,.14);scene.add(skyLight);
const skyKey=new THREE.DirectionalLight(0xa8bdc4,.19);skyKey.position.set(-9,20,8);skyKey.castShadow=false;skyKey.shadow.mapSize.set(2048,2048);Object.assign(skyKey.shadow.camera,{left:-26,right:26,top:28,bottom:-28,near:1,far:60});skyKey.shadow.normalBias=.035;skyKey.shadow.bias=-.0002;scene.add(skyKey,skyKey.target);
const lamp=new THREE.SpotLight(0xffe3ad,48,24,.16,.30,1.4);lamp.position.set(.17,-.13,-.08);lamp.target.position.set(0,-.08,-1);lamp.castShadow=true;lamp.shadow.mapSize.set(1024,1024);lamp.shadow.normalBias=.075;lamp.shadow.bias=-.00065;lamp.shadow.camera.near=.12;camera.add(lamp,lamp.target);
// Generated sky reflection: no visible second sun, soft wet-material reflections.
const skyCanvas=document.createElement('canvas');skyCanvas.width=512;skyCanvas.height=256;const skyCtx=skyCanvas.getContext('2d');let gradient=skyCtx.createLinearGradient(0,0,0,256);gradient.addColorStop(0,'#182832');gradient.addColorStop(.48,'#15212a');gradient.addColorStop(.53,'#090f12');gradient.addColorStop(1,'#06090b');skyCtx.fillStyle=gradient;skyCtx.fillRect(0,0,512,256);
const skyTex=new THREE.CanvasTexture(skyCanvas);skyTex.colorSpace=THREE.SRGBColorSpace;skyTex.mapping=THREE.EquirectangularReflectionMapping;const pmrem=new THREE.PMREMGenerator(renderer),envRT=pmrem.fromEquirectangular(skyTex);scene.environment=envRT.texture;skyTex.dispose();pmrem.dispose();
const streetBuildings=[];
const colliders=[],boxGeo=new THREE.BoxGeometry(1,1,1),materials={},animatedFog=[];
function collision(o){o.updateWorldMatrix(true,true);const b=new THREE.Box3().setFromObject(o);if(b.max.y>.30)colliders.push(b);return o;}
function box(parent,w,h,d,x,y,z,m,solid=false){const o=new THREE.Mesh(boxGeo,m);o.scale.set(w,h,d);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);if(solid)collision(o);return o;}
function group(x,y,z,angle=0){const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=angle;scene.add(g);return g;}
function metal(color=0x4b514a,roughness=.7){return new THREE.MeshStandardMaterial({color,roughness,metalness:.55,envMapIntensity:.45});}
const trim=new THREE.MeshStandardMaterial({color:0x7a7b67,roughness:.92}),dark=new THREE.MeshStandardMaterial({color:0x101817,roughness:.92}),rust=metal(0x514033,.93),iron=metal(0x333e3c),glass=new THREE.MeshStandardMaterial({color:0x203235,roughness:.29,metalness:.32,envMapIntensity:.55}),rubber=new THREE.MeshStandardMaterial({color:0x131916,roughness:.98}),wood=new THREE.MeshStandardMaterial({color:0x48473a,roughness:.98});
function rod(parent,a,b,r,m=iron,sides=8){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),v=bv.clone().sub(av);const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,v.length(),sides),m);o.position.copy(av.add(bv).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());o.castShadow=true;parent.add(o);return o;}
function uvScale(o,w,h,d,tile=2){const geometry=o.geometry.clone(),uv=geometry.attributes.uv;for(let i=0;i<uv.count;i++){const face=Math.floor(i/4);uv.setXY(i,(uv.getX(i)*(face<2?d:w)+(face<2?o.position.z-d/2:o.position.x-w/2))/tile,(uv.getY(i)*(face===2||face===3?d:h)+(face===2||face===3?o.position.z-d/2:o.position.y-h/2))/tile);}o.geometry=geometry;return o;}
function wall(parent,w,h,d,x,y,z,m,solid=true){return uvScale(box(parent,w,h,d,x,y,z,m,solid),w,h,d,2.4);}
function car(x,z,angle){return putProp('coveredCar',x,0,z,angle,1,true);}
function chainFence(x,z,length,angle){return importedFence(x,z,length,angle);}
// Merge static opaque meshes by material and spatial cell to reduce draw calls.
function mergeStatic(){
 scene.updateMatrixWorld(true);const batches=new Map(),position=new THREE.Vector3();
 scene.traverse(o=>{if(!o.isMesh||o.userData.importedAsset||o.userData.viewmodel||o.userData.atmosphere||Array.isArray(o.material)||o.material.transparent)return;
  o.getWorldPosition(position);const key=o.material.uuid+':'+Math.floor(position.x/12)+':'+Math.floor(position.z/12);
  if(!batches.has(key))batches.set(key,[]);batches.get(key).push(o);
 });
 for(const objects of batches.values()){
  if(objects.length<2)continue;const positions=[],normals=[],uvs=[],indices=[];let offset=0;
  for(const o of objects){const g=o.geometry.clone().applyMatrix4(o.matrixWorld),p=g.attributes.position,n=g.attributes.normal,u=g.attributes.uv;
   positions.push(...p.array);if(n)normals.push(...n.array);else for(let i=0;i<p.count;i++)normals.push(0,1,0);
   if(u)uvs.push(...u.array);else for(let i=0;i<p.count;i++)uvs.push(0,0);
   if(g.index)for(const ix of g.index.array)indices.push(ix+offset);else for(let i=0;i<p.count;i++)indices.push(i+offset);
   offset+=p.count;g.dispose();o.removeFromParent();
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeBoundingSphere();
  const merged=new THREE.Mesh(geometry,objects[0].material);merged.castShadow=objects.some(o=>o.castShadow);merged.receiveShadow=true;scene.add(merged);
 }
}

// Post: high-resolution, restrained film grain, subtle cold shadows and warm lights.
const target=new THREE.WebGLRenderTarget(1,1,{depthBuffer:true,type:THREE.HalfFloatType});target.depthTexture=new THREE.DepthTexture(1,1);const postScene=new THREE.Scene(),postCam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
const post=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{vehiclePositions:{value:vehicleFogPositions},vehicleDirections:{value:vehicleFogDirections},vehicleTuning:{value:vehicleFogTuning},vehicleColors:{value:vehicleFogColors},image:{value:target.texture},depthMap:{value:target.depthTexture},time:{value:0},resolution:{value:new THREE.Vector2(1,1)},near:{value:.07},far:{value:120},inverseProjection:{value:camera.projectionMatrixInverse},cameraWorld:{value:camera.matrixWorld},eye:{value:camera.position},beamPosition:{value:new THREE.Vector3()},beamDirection:{value:new THREE.Vector3()},fogSteps:{value:24},gradeTint:{value:new THREE.Vector3(1,1.025,.94)},gradeSaturation:{value:.52},gradeContrast:{value:1.06},sceneBrightness:{value:1},sceneContrast:{value:1},filmGrain:{value:0},vignetteStrength:{value:.48},fogTint:{value:new THREE.Vector3(.016,.022,.019)},flash:{value:0},beamPower:{value:1},streetPositions:{value:streetFogPositions},streetTuning:{value:new THREE.Vector4(1,16,Math.cos(.70),Math.cos(.315))},beaconTuning:{value:new THREE.Vector4(1,210,.148579074,0)},beaconCone:{value:new THREE.Vector2(.989141583,.996711172)},torchTuning:{value:new THREE.Vector4(1,24,.987227,.993734)},beaconPosition:{value:beaconOrigin},beaconDirection:{value:beaconDirection},beaconShadow:{value:null},beaconTexel:{value:new THREE.Vector2(1/2048,1/2048)},beaconMatrix:{value:beaconMatrix},beaconReady:{value:0},rainStrength:{value:1},rainGlass:{value:null}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`uniform vec3 vehiclePositions[4],vehicleDirections[4],vehicleColors[4];uniform vec4 vehicleTuning[4];uniform float filmGrain,vignetteStrength,rainStrength;uniform sampler2D image,depthMap,rainGlass,beaconShadow;uniform vec2 beaconTexel;uniform mat4 beaconMatrix;uniform vec3 beaconPosition,beaconDirection;uniform float beaconReady;
 #include <packing>
uniform float time,near,far;uniform vec2 resolution;varying vec2 vUv;
 uniform mat4 inverseProjection,cameraWorld;uniform vec3 eye,beamPosition,beamDirection;uniform float fogSteps;uniform vec3 gradeTint,fogTint;uniform float gradeSaturation,gradeContrast,sceneBrightness,sceneContrast,flash,beamPower;uniform vec3 streetPositions[10];uniform vec4 streetTuning,beaconTuning,torchTuning;uniform vec2 beaconCone;
 // Smooth, analytic height fog. No scrolling texture or coarse density slices.
 float opticalDepth(vec3 ray,float t){
  float y=max(0.,eye.y),a=ray.y*.20;
  float groundIntegral=abs(a)<.0001?t:(1.-exp(clamp(-a*t,-30.,30.)))/a;
  return max(0.,.045*t+.105*exp(-y*.20)*groundIntegral);
 }
 float shadowCompare(vec2 uv,float z){return step(z,unpackRGBAToDepth(texture2D(beaconShadow,uv)));}
 float shadowBilinear(vec2 uv,float z){
  vec2 p=uv/beaconTexel-.5,f=fract(p),base=(floor(p)+.5)*beaconTexel;
  return mix(mix(shadowCompare(base,z),shadowCompare(base+vec2(beaconTexel.x,0.),z),f.x),mix(shadowCompare(base+vec2(0.,beaconTexel.y),z),shadowCompare(base+beaconTexel,z),f.x),f.y);
 }
 float beaconVisibility(vec3 p){
  if(beaconReady<.5)return 0.;vec4 q=beaconMatrix*vec4(p,1.);q.xyz/=q.w;
  if(q.w<=0.||q.x<0.||q.x>1.||q.y<0.||q.y>1.||q.z<0.||q.z>1.)return 0.;
  float z=q.z-.000035;vec2 r=beaconTexel*.85;
  return .25*(shadowBilinear(q.xy+vec2(-r.x,-r.y),z)+shadowBilinear(q.xy+vec2(r.x,-r.y),z)+shadowBilinear(q.xy+vec2(-r.x,r.y),z)+shadowBilinear(q.xy+r,z));
 }
 // Clip integration to the actual finite cone, so thin beams never miss coarse fog slices.
 vec2 coneInterval(vec3 ray,vec3 source,vec3 axis,float range,float cosine,float visibleDistance){
  vec3 o=eye-source;float h=dot(o,axis),dh=dot(ray,axis),k=sqrt(max(0.,1.-cosine*cosine))/cosine;
  float lo=0.,hi=visibleDistance;
  if(abs(dh)<.00001){if(h<0.||h>range)return vec2(0.);}
  else{float x=-h/dh,y=(range-h)/dh;lo=max(lo,min(x,y));hi=min(hi,max(x,y));}
  if(hi<=lo)return vec2(0.);vec3 radial=o-axis*h,dr=ray-axis*dh;
  float a=dot(dr,dr)-k*k*dh*dh,b=2.*(dot(radial,dr)-k*k*h*dh),c=dot(radial,radial)-k*k*h*h;
  if(abs(a)<.00001){if(abs(b)<.00001){if(c>0.)return vec2(0.);}else if(b>0.)hi=min(hi,-c/b);else lo=max(lo,-c/b);}
  else{float d=b*b-4.*a*c;if(d<0.){if(a>0.)return vec2(0.);}else{float r0=(-b-sqrt(d))/(2.*a),r1=(-b+sqrt(d))/(2.*a),rn=min(r0,r1),rf=max(r0,r1);if(a>0.){lo=max(lo,rn);hi=min(hi,rf);}else if(lo<rn)hi=min(hi,rn);else lo=max(lo,rf);}}
  return hi>lo?vec2(lo,hi):vec2(0.);
 }
 vec3 streetScattering(vec3 ray,float visibleDistance){
  vec3 result=vec3(0.);if(streetTuning.x<=0.)return result;
  for(int j=0;j<10;j++){
   vec2 bounds=coneInterval(ray,streetPositions[j],vec3(0.,-1.,0.),streetTuning.y,streetTuning.z,visibleDistance);
   if(bounds.y<=bounds.x)continue;float stepSize=(bounds.y-bounds.x)/16.;
   for(int tap=0;tap<16;tap++){
    float t=bounds.x+(float(tap)+.5)*stepSize;vec3 delta=eye+ray*t-streetPositions[j];float r=max(.1,length(delta));
    float cone=smoothstep(streetTuning.z,streetTuning.w,-delta.y/r),fade=1.-smoothstep(streetTuning.y*.75,streetTuning.y,r);
    result+=vec3(.48,.41,.29)*streetTuning.x*cone*fade*exp(-r*.10)/(1.+r*r*.09)*exp(-opticalDepth(ray,t))*(1.-exp(-stepSize*.10));
   }
  }return result;
 }
vec2 sphereInterval(vec3 ray,vec3 source,float radius,float visibleDistance){vec3 o=eye-source;float b=dot(o,ray),d=b*b-dot(o,o)+radius*radius;if(d<=0.)return vec2(0.);float root=sqrt(d);return vec2(max(0.,-b-root),min(visibleDistance,-b+root));}
vec3 vehicleScattering(vec3 ray,float visibleDistance){
 vec3 result=vec3(0.);
 for(int j=0;j<4;j++){
  vec4 p=vehicleTuning[j];if(p.x<=0.||dot(vehicleColors[j],vehicleColors[j])<.00000001)continue;
  vec2 bounds=j<2?coneInterval(ray,vehiclePositions[j],vehicleDirections[j],p.y,p.z,visibleDistance):sphereInterval(ray,vehiclePositions[j],p.y,visibleDistance);
  if(bounds.y<=bounds.x)continue;float ds=(bounds.y-bounds.x)/12.;
  for(int tap=0;tap<12;tap++){float t=bounds.x+(float(tap)+.5)*ds;vec3 delta=eye+ray*t-vehiclePositions[j];float r=max(.1,length(delta));float shape=j<2?smoothstep(p.z,p.w,dot(delta/r,vehicleDirections[j])):1.;float fade=1.-smoothstep(p.y*(j<2?.75:mix(.35,.85,p.w)),p.y,r);float falloff=1./(1.+r*r*(j<2?.18:p.z));result+=vehicleColors[j]*p.x*shape*fade*falloff*exp(-opticalDepth(ray,t))*(1.-exp(-ds*.1));}
 }return result;
}
 vec3 torchScattering(vec3 ray,float visibleDistance){
  vec3 result=vec3(0.);if(beamPower*torchTuning.x<=0.)return result;
  vec2 bounds=coneInterval(ray,beamPosition,beamDirection,torchTuning.y,torchTuning.z,visibleDistance);if(bounds.y<=bounds.x)return result;
  float stepSize=(bounds.y-bounds.x)/fogSteps;
  for(int tap=0;tap<32;tap++){if(float(tap)>=fogSteps)break;
   float t=bounds.x+(float(tap)+.5)*stepSize;vec3 delta=eye+ray*t-beamPosition;float r=max(.1,length(delta));
   float cone=smoothstep(torchTuning.z,torchTuning.w,dot(delta/r,beamDirection));float fade=1.-smoothstep(torchTuning.y*.8,torchTuning.y,r);
   result+=vec3(.065,.053,.036)*beamPower*torchTuning.x*cone*fade*exp(-r*.10)/(1.+r*r*.12)*exp(-opticalDepth(ray,t))*(1.-exp(-stepSize*.10));
  }return result;
 }
 vec3 beaconScattering(vec3 ray,float visibleDistance){
  vec3 result=vec3(0.);if(beaconTuning.x<=0.)return result;
  vec2 bounds=coneInterval(ray,beaconPosition,beaconDirection,beaconTuning.y,beaconCone.x,visibleDistance);if(bounds.y<=bounds.x)return result;
  float stepSize=(bounds.y-bounds.x)/24.;
  for(int tap=0;tap<24;tap++){
   float t=bounds.x+(float(tap)+.5)*stepSize;vec3 p=eye+ray*t,delta=p-beaconPosition;float r=max(.1,length(delta));
   float cone=smoothstep(beaconCone.x,beaconCone.y,dot(delta/r,beaconDirection)),fade=1.-smoothstep(beaconTuning.y*.85,beaconTuning.y,r);
   result+=vec3(.0335,.0251,.0154)*beaconTuning.x*cone*fade*beaconVisibility(p)*min(3.,6500./max(64.,r*r))*exp(-opticalDepth(ray,t))*(1.-exp(-stepSize*.06));
  }return result;
 }
 vec3 beaconCore(vec3 ray,float visibleDistance){
  vec3 delta=beaconPosition-eye;float along=dot(delta,ray);
  if(along<=0.||visibleDistance<along-.85)return vec3(0.);
  float radius=length(delta-ray*along),width=max(.18,along/resolution.y*.7);
  float core=exp(-radius*radius/(width*width));float halo=exp(-radius*radius/.55)*.08;
  return vec3(.85,.58,.30)*beaconTuning.w*(core+halo)*exp(-along*.018);
 }
 vec3 integrateFog(vec3 surface,float distanceZ){
  vec4 v=inverseProjection*vec4(vUv*2.-1.,1.,1.);vec3 rayV=normalize(v.xyz/v.w),ray=normalize((cameraWorld*vec4(rayV,0.)).xyz);
  float visibleDistance=min(160.,distanceZ/max(.05,-rayV.z));float fogDistance=distanceZ>far*.995?min(40.,visibleDistance):visibleDistance;float transmission=exp(-opticalDepth(ray,fogDistance));
  // Ground-level streets fade into fog around 40 m; elevated lighthouse light remains visible.
  return surface*transmission+(fogTint+vec3(.04,.047,.054)*flash)*(1.-transmission)+streetScattering(ray,min(60.,visibleDistance))+torchScattering(ray,min(60.,visibleDistance))+beaconScattering(ray,visibleDistance)+beaconCore(ray,visibleDistance)+vehicleScattering(ray,min(45.,visibleDistance));
 }
 float depth(vec2 p){float z=texture2D(depthMap,p).x;return near*far/(far-z*(far-near));}
 void main(){vec2 p=vUv-.5;vec4 rain=texture2D(rainGlass,vUv);float wet=rain.b*min(rainStrength,2.);vec2 refractUV=clamp(vUv+(rain.rg-vec2(128./255.))*.008*wet*vec2(resolution.y/resolution.x,1.),vec2(.001),vec2(.999));vec2 offset=p*dot(p,p)*.001;vec3 c=vec3(texture2D(image,refractUV+offset).r,texture2D(image,refractUV).g,texture2D(image,refractUV-offset).b);
 float d=depth(refractUV),occlusion=0.;for(int i=0;i<8;i++){float a=float(i)*.7854;float nd=depth(vUv+vec2(cos(a),sin(a))*4./resolution);float delta=d-nd;occlusion+=smoothstep(.025,.18,delta)*(1.-smoothstep(.2,.7,delta));}c*=1.-occlusion*.018;
 c=integrateFog(c,d);c+=vec3(rain.a*wet*.025*max(.08,dot(c,vec3(.2126,.7152,.0722))))*(1.+flash);
 float l=dot(c,vec3(.2126,.7152,.0722));c=mix(vec3(l),c,gradeSaturation)*gradeTint;c=max(vec3(0.),(c-.025)*gradeContrast*sceneContrast+.025);c*=1.-smoothstep(.18,.71,length(p))*vignetteStrength;
 gl_FragColor=vec4(max(c*sceneBrightness,vec3(0.)),1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 if(filmGrain>0.0){
  vec3 grainSeed=fract(vec3(floor(gl_FragCoord.xy),mod(floor(time*24.0),4096.0))*.1031);
  grainSeed+=dot(grainSeed,grainSeed.yzx+33.33);
  float grain=fract((grainSeed.x+grainSeed.y)*grainSeed.z)-.5;
  gl_FragColor.rgb=clamp(gl_FragColor.rgb+grain*filmGrain*.16,0.,1.);
 }
 }`});postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),post));
prepareFogPass();
const palettePresets={
 homecoming:{tint:[1,1.025,.92],saturation:.52,contrast:1.06,fog:[.017,.022,.019]},
 cold:{tint:[.86,.97,1.08],saturation:.55,contrast:1.04,fog:[.014,.020,.028]},
 rust:{tint:[1.08,.96,.82],saturation:.46,contrast:1.08,fog:[.024,.019,.014]},
 neutral:{tint:[1,1,1],saturation:.80,contrast:1,fog:[.019,.022,.023]}
};
const mobileDevice=matchMedia('(any-pointer: coarse)').matches || (navigator.maxTouchPoints>0&&innerWidth<1100) || new URLSearchParams(location.search).get('mobile')==='1';
function saveSettings(){try{localStorage.setItem('brain-fog-settings',JSON.stringify(Object.fromEntries(['quality','screenResolution','palette','showFPS','lightning','volume','stepsVolume','thunderVolume','rainVolume','ambienceVolume','electricalVolume','engineVolume'].map(k=>[k,$(k).type==='checkbox'?$(k).checked:$(k).value]))));}catch{}}
let savedSettings={};try{const saved=JSON.parse(localStorage.getItem('brain-fog-settings')||'{}');savedSettings=saved;for(const [k,v] of Object.entries(saved)){const el=$(k);if(!el)continue;if(el.type==='checkbox')el.checked=Boolean(v);else if(el.tagName!=='SELECT'||[...el.options].some(o=>o.value===v))el.value=v;}}catch{}
if(mobileDevice&&!Object.prototype.hasOwnProperty.call(savedSettings,'screenResolution'))$('screenResolution').value='adaptive';
function applyPalette(){const p=palettePresets[$('palette').value]||palettePresets.homecoming;post.uniforms.gradeTint.value.fromArray(p.tint);post.uniforms.gradeSaturation.value=p.saturation;post.uniforms.gradeContrast.value=p.contrast;post.uniforms.fogTint.value.fromArray(p.fog);saveSettings();}
function resize(){const high=$('quality').value==='high';post.uniforms.fogSteps.value=high?32:24;const selected=$('screenResolution').value;let [w,h]=selected==='adaptive'?(()=>{const factor=Math.min(devicePixelRatio||1,(mobileDevice?880:1280)/Math.max(innerWidth,innerHeight));return [Math.round(innerWidth*factor),Math.round(innerHeight*factor)];})():selected==='native'?[Math.round(innerWidth*Math.min(devicePixelRatio,1.5)),Math.round(innerHeight*Math.min(devicePixelRatio,1.5))]:selected.split('x').map(Number);const cap=Math.min(1,2560/w,1440/h);w=Math.max(2,Math.round(w*cap));h=Math.max(2,Math.round(h*cap));renderer.setPixelRatio(1);renderer.setSize(w,h,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();target.setSize(w,h);resizeFogPass(w,h,high);post.uniforms.resolution.value.set(w,h);lamp.castShadow=true;lamp.shadow.mapSize.set(high?1024:512,high?1024:512);if(lamp.shadow.map){lamp.shadow.map.dispose();lamp.shadow.map=null;}saveSettings();}
addEventListener('resize',resize);for(const k of ['quality','screenResolution'])$(k).addEventListener('change',resize);$('palette').addEventListener('change',applyPalette);$('showFPS').addEventListener('change',()=>{$('fps').hidden=!$('showFPS').checked;saveSettings();});$('lightning').addEventListener('change',saveSettings);$('volume').addEventListener('change',saveSettings);$('fps').hidden=!$('showFPS').checked;resize();applyPalette();
let fpsElapsed=0,fpsFrames=0,drawCalls=0,drawTriangles=0;
// Controller: substeps, circular footprint, axis-separated sliding, sprint and jump.
const music=new HorrorMusic();music.bindControls($('music-settings'));
let audio=null,active=false,started=false,yaw=-.12,pitch=-.045,elapsed=0,bob=0,stride=0,last=performance.now(),nextFlicker=60,feet=0,verticalVelocity=0,grounded=true,jumpRequested=false,landingKick=0;
const keys=new Set(),vel=new THREE.Vector2();
const mobile=new FoggedMobileControls({
 onLook:(dx,dy)=>{if(!active)return;yaw-=dx*.0032;pitch=clamp(pitch-dy*.0032,-1.35,1.35);},
 onJump:()=>{if(active&&grounded)jumpRequested=true;},
 onPause:()=>leave(),
 onSound:()=>toggleSound()
});
function toggleSound(){if(!audio)return;audio.muted=!audio.muted;audio.level(active);$('soundLabel').textContent=audio.muted?'M · SOUND OFF':'ESC · PAUSE';mobile.setSoundMuted(audio.muted);}

function blocked(x,z){return colliders.some(b=>{if(b.max.y<=feet+.06||b.min.y>=feet+1.7)return false;const dx=x-clamp(x,b.min.x,b.max.x),dz=z-clamp(z,b.min.z,b.max.z);return dx*dx+dz*dz<.28*.28;});}
function move(dx,dz){const count=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.085));for(let i=0;i<count;i++){if(!blocked(camera.position.x+dx/count,camera.position.z))camera.position.x+=dx/count;if(!blocked(camera.position.x,camera.position.z+dz/count))camera.position.z+=dz/count;}}
function pause(){active=false;mobile.setActive(false);dragging=false;updatePauseMap();keys.clear();vel.set(0,0);jumpRequested=false;$('menu').hidden=false;$('enter').textContent=started?'Return to the fog':'Enter the fog';if(audio){audio.pauseFlashlight();audio.level(false);}}
let dragLook=false,dragging=false,lastPointerUnlockAt=-Infinity;
function beginPlay(){active=true;started=true;mobile.setActive(true);mobile.setSoundMuted(audio?.muted);if(mobile.enabled)dragLook=true;dragging=false;keys.clear();$('menu').hidden=true;$('status').textContent='';last=performance.now();if(audio){audio.resumeFlashlight();audio.level(true);}}
function lockError(){dragLook=true;beginPlay();$('soundLabel').textContent='DRAG TO LOOK · ESC TO PAUSE';}
for(const name of ['steps','thunder','rain','ambience','electrical','engine']){const el=$(name+'Volume'),out=$(name+'Percent');const sync=()=>{out.value=Math.round(+el.value*100)+'%';if(audio)audio.mix(name,+el.value);saveSettings();};el.addEventListener('input',sync);sync();}
$('enter').onclick=()=>{music.start().catch(e=>console.warn('Music:',e.message));try{if(!audio)audio=new Ambience();audio.ctx.resume().catch(()=>{});}catch(e){$('status').textContent='Audio is unavailable. You can continue without sound.';}if(mobile.enabled){beginPlay();return;}if(lightLabIsOpen()||travelLabIsOpen()){lockError();return;}try{const p=renderer.domElement.requestPointerLock();if(p?.catch)p.catch(lockError);}catch(e){lockError();}};
document.addEventListener('pointerlockchange',()=>{if(document.pointerLockElement===renderer.domElement){dragLook=false;beginPlay();}else if(!dragLook){lastPointerUnlockAt=performance.now();pause();}});document.addEventListener('pointerlockerror',lockError);
document.addEventListener('mousemove',e=>{if(active&&!e.target.closest?.('#light-lab,#language-control')&&(!dragLook||dragging)){yaw-=e.movementX*.00165;pitch=clamp(pitch-e.movementY*.00165,-1.35,1.35);}});
renderer.domElement.addEventListener('pointerdown',e=>{if(active&&dragLook){dragging=true;renderer.domElement.setPointerCapture(e.pointerId);}});
addEventListener('pointerup',()=>dragging=false);
function handleGameEscape(e){
 if(e.repeat)return;e.preventDefault();
 if(active){leave();return;}
 // Native Escape may release pointer lock before delivering keydown: do not reopen immediately.
 if(started&&!$('menu').hidden&&!$('enter').disabled&&performance.now()-lastPointerUnlockAt>250){document.activeElement?.blur();$('enter').click();}
}
addEventListener('keydown',e=>{if(e.code==='Escape'){handleGameEscape(e);return;}if(!active||e.target.closest?.('#language-control'))return;if(['KeyW','KeyA','KeyS','KeyD','ShiftLeft','ShiftRight','Space'].includes(e.code)){e.preventDefault();keys.add(e.code);if(e.code==='Space'&&!e.repeat&&grounded)jumpRequested=true;}if(e.code==='KeyM'&&!e.repeat)toggleSound();});addEventListener('keyup',e=>keys.delete(e.code));
function leave(){dragLook=false;dragging=false;fpsElapsed=0;fpsFrames=0;if(document.pointerLockElement)document.exitPointerLock();pause();}addEventListener('blur',leave);document.addEventListener('visibilitychange',()=>{if(document.hidden)leave();});$('volume').oninput=()=>{if(audio)audio.level(active);};
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();leave();$('enter').disabled=true;$('status').textContent='Graphics context lost. Reload this page.';});
const events=[];let noteUntil=0;const debug=new URLSearchParams(location.search).has('debug');$('debug').hidden=!debug;
let lastDebugUpdate=0;
function frame(now){requestAnimationFrame(frame);const frameSeconds=Math.max(.0001,(now-last)/1000),dt=Math.min(frameSeconds,.05);last=now;if(document.hidden)return;profileStage('idle');renderBudget={};
 if(active){elapsed+=dt;const sx=clamp(Number(keys.has('KeyD'))-Number(keys.has('KeyA'))+mobile.axes.x,-1,1),sz=clamp(Number(keys.has('KeyW'))-Number(keys.has('KeyS'))+mobile.axes.y,-1,1);const analogAmount=Math.min(1,Math.hypot(sx,sz));const wish=new THREE.Vector2(Math.cos(yaw)*sx-Math.sin(yaw)*sz,-Math.sin(yaw)*sx-Math.cos(yaw)*sz);const running=mobile.running||keys.has('ShiftLeft')||keys.has('ShiftRight'),speed=running?3.55:1.72;if(wish.lengthSq())wish.normalize().multiplyScalar(speed*analogAmount);vel.lerp(wish,1-Math.exp(-dt*(wish.lengthSq()?4:8)));const x=camera.position.x,z=camera.position.z;move(vel.x*dt,vel.y*dt);const distance=Math.hypot(camera.position.x-x,camera.position.z-z),weight=clamp(distance/Math.max(dt,.001)/speed,0,1);
 // Jump is a physical vertical arc. Collision tests follow the player's height.
 if(jumpRequested&&grounded){verticalVelocity=4.6;grounded=false;}jumpRequested=false;
 const oldFeet=feet;verticalVelocity-=13.8*dt;let nextFeet=feet+verticalVelocity*dt,landed=false;
 for(const b of colliders){const dx=camera.position.x-clamp(camera.position.x,b.min.x,b.max.x),dz=camera.position.z-clamp(camera.position.z,b.min.z,b.max.z);if(dx*dx+dz*dz>=.28*.28)continue;
  if(verticalVelocity<=0&&oldFeet>=b.max.y-.035&&nextFeet<=b.max.y){nextFeet=Math.max(nextFeet,b.max.y);landed=true;}
  if(verticalVelocity>0&&oldFeet+1.7<=b.min.y+.02&&nextFeet+1.7>=b.min.y){nextFeet=b.min.y-1.7;verticalVelocity=0;}
 }
 if(nextFeet<=0){nextFeet=0;landed=true;}if(landed){if(!grounded){landingKick=-.075;if(audio)audio.footstep(new THREE.Vector3(camera.position.x,.08,camera.position.z));}verticalVelocity=0;}grounded=landed;feet=nextFeet;
 if(grounded){bob+=distance*(running?8:7);stride+=distance;}else stride=0;
 landingKick=THREE.MathUtils.damp(landingKick,0,11,dt);const shake=grounded?weight:0;
 camera.position.y=feet+1.70+Math.sin(bob)*(running?.054:.038)*shake+landingKick;
 camera.rotation.set(pitch+Math.cos(bob*.5)*.007*shake,yaw,Math.sin(bob*.5)*(running?.010:.006)*shake,'YXZ');
 if(audio){audio.update(dt);if(grounded&&stride>.86){audio.footstep(new THREE.Vector3(camera.position.x,feet+.08,camera.position.z));stride=0;}}
 animateFlashlight(frameSeconds);for(const e of events)if(!e.done&&Math.hypot(camera.position.x-e.x,camera.position.z-e.z)<e.r){e.done=true;$('note').textContent=e.text;$('note').style.opacity=1;noteUntil=elapsed+6;}if(elapsed>noteUntil)$('note').style.opacity=0;}
 animateCorn(active?dt:0,elapsed);animateGrass(elapsed);animateTerrain();updateTreeVisibility();
 const isRunning=mobile.running||keys.has('ShiftLeft')||keys.has('ShiftRight');animateAtmosphere(active?frameSeconds:0,elapsed,isRunning,active?clamp(vel.length()/1.72,0,1):0);skyKey.position.set(camera.position.x-12,26,camera.position.z-22);skyKey.target.position.set(camera.position.x,0,camera.position.z);

 animateFireEngine(active?frameSeconds:0);animateStreetLights(active?frameSeconds:0,elapsed);animateStationLights();animateBeacon(active?frameSeconds:0);const stormFlash=animateStorm(active?frameSeconds:0);animateRain(active?Math.min(frameSeconds,.25):0,stormFlash);if(debug&&terrainDaylight){skyLight.intensity=1.3;skyKey.intensity=2;}
 // Let the renderer cull trees per light's frustum; camera movement must not change street shadows.
 // Trees are rendered by fixed world-cell instances; original groups retain root/map metadata.
 profileStage('update');renderer.info.autoReset=false;renderer.info.reset();renderer.setRenderTarget(target);renderer.render(scene,camera);profileStage('scene');drawCalls=renderer.info.render.calls;drawTriangles=renderer.info.render.triangles;renderer.setRenderTarget(null);syncBeaconShadow();renderWaterReflection(now*.001);renderStationReflection(now*.001);profileStage('reflection');post.uniforms.time.value=now*.001;
 lamp.getWorldPosition(post.uniforms.beamPosition.value);lamp.target.getWorldPosition(post.uniforms.beamDirection.value);post.uniforms.beamDirection.value.sub(post.uniforms.beamPosition.value).normalize();post.uniforms.beamPower.value=lamp.intensity/48;renderFogPass();profileStage('fog');renderer.render(postScene,postCam);profileStage('post');recordPerformance(frameSeconds,drawCalls,drawTriangles);fpsElapsed+=frameSeconds;fpsFrames++;if(fpsElapsed>=.5){$('fps').textContent=`${Math.round(fpsFrames/fpsElapsed)} FPS`;fpsElapsed=0;fpsFrames=0;}
 if(debug&&now-lastDebugUpdate>250){lastDebugUpdate=now;$('debug').textContent=`v0.6.31 ${active?I18n.translate('PLAY'):I18n.translate('PAUSE')} ${grounded?I18n.translate('GROUND'):I18n.translate('AIR')} y ${feet.toFixed(2)} x ${camera.position.x.toFixed(2)} z ${camera.position.z.toFixed(2)}\n${drawCalls} ${I18n.translate('calls')} · ${drawTriangles} ${I18n.translate('triangles')} · ${colliders.length} ${I18n.translate('colliders')} · ${audio?I18n.translate(audio.ctx.state):I18n.translate('audio off')} · ${I18n.translate('next flicker')} ${Math.ceil(nextFlicker)}${I18n.translate('s')} · ${I18n.translate('flicker')} ${flashlightBursts} · ${I18n.translate('grass')} ${grassCount}`;}
}
async function init(){try{const loader=new THREE.TextureLoader();for(const [name,data] of Object.entries(MATERIAL_ASSETS)){const maps={};await Promise.all(Object.entries(data).map(async([key,url])=>{const t=await loader.loadAsync(url);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());if(key==='map')t.colorSpace=THREE.SRGBColorSpace;maps[key]=t;}));materials[name]=new THREE.MeshStandardMaterial({...maps,color:name==='brick'?0x8b8d7d:name==='plaster'?0xb4b4a1:0x8b9695,roughness:name==='asphalt'?.65:.95,metalness:name==='asphalt'?.09:0,normalScale:new THREE.Vector2(.55,.55),envMapIntensity:.32});}
 await loadTerrainTextures();await loadProps();if(document.fonts)await document.fonts.ready;prepareAtmosphere();prepareStreetLights();await loadTownAssets();await loadStreetProps();await loadCorn();buildTown();prepareCorn();prepareWarehouseAccess(townObjects.find(g=>g.name==='town_06'));prepareJunctionMarkings();await prepareFireEngine();prepareGrass();createHand();prepareWeather();prepareStationLights();prepareStationWindows();prepareLightLab();mergeStatic();prepareTreeVisibility();preparePauseMap();camera.rotation.set(pitch,yaw,0,'YXZ');if(debug){const select=document.createElement('select');select.id='inspection';select.setAttribute('aria-label','Inspect location');for(const [name,x,z,angle,look=0] of [['Cornfield entrance',32,-31,0,0],['Cornfield interior',54,-65,0,0],['Cornfield far edge',88,-97,Math.PI,0],['Broken bicycle',44,-5.8,0,-.45],['Forest gate',-23,11.05,.994,.10],['Forest props',-49,24,0,-.4],['Manholes',-2,-55,0,-.65],['Barriers',-2,-68,0,-.1],['Parking',51,18,0],['Car windows',8,7.3,3.05,.06],['Puddles',-1.8,-36.7,.67,-.72],['Roadside boxes',roadsideBoxes[0].x+1.5,roadsideBoxes[0].z+2,.644,-.48],['Eastern forest',50,-45,0,0],['Fire engine front',5,7,-Math.PI*.75,-.08],['Fire engine rear',13,15,Math.PI*.25,-.08],['Engine audio 20m',9,-9.1,0],['Engine audio 10m',9,1,0],['Engine audio close',9,7,0],['Footsteps: asphalt',0,-24,0,-.45],['Footsteps: ground',-40,0,.994,-.45],['Footsteps: grass',-14,-50,0,-.45],['Night sky',0,0,0,1.15],['Junction',0,0,0],['Fire station',0,11,Math.PI],['Station all gates',-3.9,6,Math.PI,.12],['Station forecourt',0,-5,Math.PI,.02],['Station gate left',-11.019,12,Math.PI,.25],['Shops',45,1,0],['House 01',0,-72,0],['Streetlight glow',0,-72,2.23,-.10],['Streetlight ground',0,-72,2.23,-.45],['Cleared house site',15,-61,0],['Removed blue house',2,-34,-Math.PI/2],['Warehouse',76,0,-Math.PI/2],['Warehouse interior',87,0,-Math.PI/2],['Station windows',10,15,Math.PI,0],['Forest',-39,0,0],['Lighthouse',-77,-15,0],['Lighthouse approach',-40,0,.923,.34],['Lighthouse south 42m',-77,14,0,.40],['Lighthouse north 42m',-77,-70,Math.PI,.40],['Lighthouse distant',-16,-5,1.21,.25],['Lighthouse east 45m',-32,-28,Math.PI/2,.386],['Lighthouse sky',-77,-15,0,.825],['Grass edge',-9,-50,Math.PI/2,-.35],['Lawn close',-14,-50,Math.PI/2,-.65],['Soft road edge',-5,-50,Math.PI/2,-.72],['Forest path ground',-40,0,Math.PI/2,-.65],['Lamp fixture close',-5,-40,0,.90],['Lamp reverse',-5,-48,Math.PI,.90],['Oak roots',-25,-82,-.74,-.48],['Lamp underside',-5,-42.8,0,1.32]]){const opt=document.createElement('option');opt.textContent=name;opt.dataset.travelName=name;opt.value=JSON.stringify([x,z,angle,look]);opt.selected=name==='Parking';select.append(opt);}select.onchange=()=>{const [x,z,a,look]=JSON.parse(select.value);camera.position.set(x,1.7,z);feet=0;yaw=a;pitch=look;camera.rotation.set(pitch,yaw,0,'YXZ');updatePauseMap();};document.querySelector('.options').append(select);} if(debug){prepareRenderProfile();preparePerformanceTest();preparePlaytest();prepareCornCheck();prepareTravelLab();for(const id of ['playtest'])document.getElementById('light-lab-body').append(document.getElementById(id));} renderer.compile(scene,camera);const initialFog=scene.fog;scene.fog=new THREE.FogExp2(0x111b22,.038);renderer.compile(scene,camera);scene.fog=initialFog;renderer.compile(fogScene,postCam);renderer.compile(postScene,postCam);$('enter').disabled=false;$('enter').textContent='Enter the fog';$('status').textContent='';requestAnimationFrame(frame);
 }catch(e){console.error(e);$('status').textContent='Could not load resources. Extract the complete archive and open index.html.';}}
init();
