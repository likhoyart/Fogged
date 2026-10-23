'use strict';
// Approved 13 September puddle material. One mask lookup on the existing road surface.
const waterSurface={center:new THREE.Vector2(),size:new THREE.Vector2(),enabled:{value:1},time:{value:0},mask:{value:null},reflectionPass:{value:0},reflectionTexture:{value:null},atlasStats:null};
function surfaceHash(x,y){let n=Math.imul(x,374761393)+Math.imul(y,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;}
function surfaceNoise(x,y){const i=Math.floor(x),j=Math.floor(y),a=x-i,b=y-j,u=a*a*(3-2*a),v=b*b*(3-2*b);return THREE.MathUtils.lerp(THREE.MathUtils.lerp(surfaceHash(i,j),surfaceHash(i+1,j),u),THREE.MathUtils.lerp(surfaceHash(i,j+1),surfaceHash(i+1,j+1),u),v);}
function surfaceDepth(x,z,phase=0){
 // Several joined shallow depressions, chipped banks and narrow drainage fingers.
 const basin=Math.max(.83-Math.hypot((x+.30)/1.86,(z+.09)/.88),.62-Math.hypot((x-1.05)/.75,(z-.16)/.64),.48-Math.hypot((x+.91)/.83,(z-.55)/.47));
 const crinkle=(surfaceNoise(x*5.5+19+phase,z*5.5+31-phase)-.5)*.16+(surfaceNoise(x*19+44-phase,z*19+7+phase)-.5)*.04;
 return basin+crinkle;
}

function prepareWaterSurface(){
 const bounds={minX:Math.min(...roadRects.map(r=>r[0]))-1,minZ:Math.min(...roadRects.map(r=>r[1]))-1,maxX:Math.max(...roadRects.map(r=>r[0]+r[2]))+1,maxZ:Math.max(...roadRects.map(r=>r[1]+r[3]))+1};
 const W=2048,H=2560,data=new Uint8Array(W*H*4),sx=bounds.maxX-bounds.minX,sz=bounds.maxZ-bounds.minZ;
 waterSurface.center.set((bounds.minX+bounds.maxX)/2,(bounds.minZ+bounds.maxZ)/2);waterSurface.size.set(sx,sz);
 let samples=0;
 for(const p of puddles){
  const approved=Math.hypot(p.position.x+3.09,p.position.z+38.25)<.03;
  const w=approved?4.65:p.userData.size[0],d=approved?2.95:p.userData.size[1],phase=approved?0:p.userData.phase;
  p.userData.waterSize=[w,d];p.geometry.boundingSphere=new THREE.Sphere(new THREE.Vector3(),Math.hypot(w,d)/2);
  const x0=Math.max(0,Math.floor((p.position.x-w/2-bounds.minX)/sx*W)),x1=Math.min(W,Math.ceil((p.position.x+w/2-bounds.minX)/sx*W));
  const z0=Math.max(0,Math.floor((p.position.z-d/2-bounds.minZ)/sz*H)),z1=Math.min(H,Math.ceil((p.position.z+d/2-bounds.minZ)/sz*H));
  for(let j=z0;j<z1;j++)for(let i=x0;i<x1;i++){
   const x=bounds.minX+(i+.5)/W*sx,z=bounds.minZ+(j+.5)/H*sz;
   const localX=(x-p.position.x)/w*4.65,localZ=(z-p.position.z)/d*2.95,depth=surfaceDepth(localX,localZ,phase);
   const paving=THREE.MathUtils.smoothstep(terrainFields(x,z).asphalt,.94,1),pool=THREE.MathUtils.smoothstep(depth,-.006,.023)*paving,wet=THREE.MathUtils.smoothstep(depth,-.18,.01)*paving,k=(j*W+i)*4;
   data[k]=Math.max(data[k],Math.round(pool*255));data[k+1]=Math.max(data[k+1],Math.round(wet*255));data[k+2]=Math.max(data[k+2],Math.round(THREE.MathUtils.clamp(depth*1.6,0,1)*paving*255));data[k+3]=255;samples++;
  }
 }
 const texture=new THREE.DataTexture(data,W,H,THREE.RGBAFormat);texture.magFilter=texture.minFilter=THREE.LinearFilter;texture.generateMipmaps=false;texture.needsUpdate=true;waterSurface.mask.value=texture;waterSurface.reflectionTexture.value=waterReflection.target.texture;
 waterSurface.atlasStats={size:[W,H],bytes:data.byteLength,samples,puddles:puddles.length};
}
const surfaceGLSL=`
 uniform sampler2D surfaceMask,surfaceReflection;
 uniform vec2 surfaceCenter,surfaceSize;uniform mat4 surfaceReflectionMatrix;
 uniform float surfaceEnabled,surfaceTime,surfaceReflectionReady,surfaceReflectionPass;
 float surfaceHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 vec2 surfaceSlope(vec2 p){
  vec2 slope=vec2(0.);vec2 grid=floor(p*2.4);
  for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){
   vec2 cell=grid+vec2(float(i),float(j));float seed=surfaceHash(cell);float age=mod(surfaceTime+seed*3.7,2.8);
   vec2 origin=(cell+vec2(surfaceHash(cell+17.),surfaceHash(cell+59.)))/2.4;
   vec2 delta=p-origin;float r=length(delta),radius=age*.20;
   float envelope=exp(-pow((r-radius)/.025,2.))*smoothstep(0.,.07,age)*(1.-smoothstep(.25,1.05,age));
   slope+=delta/max(r,.001)*sin((r-radius)*155.)*envelope*.012;
  }return slope;
 }
`;
function applyWaterSurfaceToTerrain(s){
 s.uniforms.surfaceMask=waterSurface.mask;s.uniforms.surfaceCenter={value:waterSurface.center};s.uniforms.surfaceSize={value:waterSurface.size};s.uniforms.surfaceEnabled=waterSurface.enabled;s.uniforms.surfaceTime=waterSurface.time;s.uniforms.surfaceReflectionPass=waterSurface.reflectionPass;s.uniforms.surfaceReflection=waterSurface.reflectionTexture;s.uniforms.surfaceReflectionReady=waterReflection.ready;s.uniforms.surfaceReflectionMatrix={value:waterReflection.matrix};
 s.fragmentShader=surfaceGLSL+s.fragmentShader;
 // Sample the very same asphalt under the layer; no colored overlay and no second ground mesh.
 s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 vec2 surfaceUV=(terrainXZ-surfaceCenter)/surfaceSize+.5;
 float surfaceInside=step(0.,surfaceUV.x)*step(0.,surfaceUV.y)*step(surfaceUV.x,1.)*step(surfaceUV.y,1.)*surfaceEnabled;
 vec3 waterMask=texture2D(surfaceMask,clamp(surfaceUV,0.,1.)).rgb*surfaceInside;
 float pool=waterMask.r,wet=waterMask.g;
 diffuseColor.rgb*=mix(1.,.67,wet);`);
 s.fragmentShader=s.fragmentShader.replace('float roughnessFactor=mix(.97,.91,paved);','float roughnessFactor=mix(mix(mix(.97,.91,paved),.44,wet),.085,pool);');
 // Construct water normal in world space first, then transform into the view space used by lighting.
 s.fragmentShader=s.fragmentShader.replace('#include <clearcoat_normal_fragment_begin>',`
 vec2 waterSlope=vec2(0.);if(pool>.001)waterSlope=surfaceSlope(terrainXZ);
 vec3 waterWorldNormal=normalize(vec3(-waterSlope.x,1.,-waterSlope.y));
 normal=normalize(mix(normal,mat3(viewMatrix)*waterWorldNormal,pool));
 #include <clearcoat_normal_fragment_begin>`);
 s.fragmentShader=s.fragmentShader.replace('#include <lights_physical_fragment>','#include <lights_physical_fragment>\n material.specularColor=mix(material.specularColor,vec3(.0204),pool);');
 s.fragmentShader=s.fragmentShader.replace('#include <opaque_fragment>',`
 if(pool>.001&&surfaceReflectionPass<.5){
  vec3 eyeDirection=normalize(cameraPosition-vec3(terrainXZ.x,.028,terrainXZ.y));
  float F=.0204+.9796*pow(1.-clamp(dot(waterWorldNormal,eyeDirection),0.,1.),5.);
  // Project the perturbed world position. Both the ripple and reflection stay anchored to the road.
  vec4 reflectionCoord=surfaceReflectionMatrix*vec4(terrainXZ.x+waterSlope.x*.09,.028,terrainXZ.y+waterSlope.y*.09,1.);
  vec2 reflectionUV=reflectionCoord.xy/reflectionCoord.w;
  float valid=surfaceReflectionReady*step(0.,reflectionUV.x)*step(0.,reflectionUV.y)*step(reflectionUV.x,1.)*step(reflectionUV.y,1.)*step(0.,reflectionCoord.w);
  vec3 reflected=texture2D(surfaceReflection,clamp(reflectionUV,.001,.999)).rgb;
  vec3 bottom=(reflectedLight.directDiffuse+reflectedLight.indirectDiffuse)*(.82-.12*waterMask.b);
  vec3 waterColor=bottom*(1.-F)+reflectedLight.directSpecular+mix(reflectedLight.indirectSpecular,reflected*F,valid)+totalEmissiveRadiance;
  outgoingLight=mix(outgoingLight,waterColor,pool);
 }
 #include <opaque_fragment>`);
}
