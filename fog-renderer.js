'use strict';
// Low-resolution radiance only. Geometry, source cores, grading and grain stay full resolution.
// Spatial depth-aware upsampling, no temporal history, jitter or scrolling noise.
let fogTarget,fogScene,fogMaterial;
function prepareFogPass(){
 fogTarget=new THREE.WebGLRenderTarget(1,1,{depthBuffer:false,stencilBuffer:false,type:THREE.HalfFloatType,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter});
 const original=post.fragmentShader,prefix=original.slice(0,original.indexOf(' vec3 integrateFog'));
 fogMaterial=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,uniforms:post.uniforms,vertexShader:post.vertexShader,fragmentShader:prefix+`
 void main(){float z=texture2D(depthMap,vUv).x,d=near*far/(far-z*(far-near));vec4 v=inverseProjection*vec4(vUv*2.-1.,1.,1.);vec3 rayV=normalize(v.xyz/v.w),ray=normalize((cameraWorld*vec4(rayV,0.)).xyz);float end=min(160.,d/max(.05,-rayV.z));
 vec3 light=streetScattering(ray,min(60.,end))+torchScattering(ray,min(60.,end))+beaconScattering(ray,end)+vehicleScattering(ray,min(45.,end));gl_FragColor=vec4(light,d);}`});
 fogScene=new THREE.Scene();fogScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),fogMaterial));
 post.uniforms.fogImage={value:fogTarget.texture};post.uniforms.fogResolution={value:new THREE.Vector2(1,1)};
 const upsample=`uniform sampler2D fogImage;uniform vec2 fogResolution;
 vec3 upsampleFog(float depthZ){vec2 q=vUv*fogResolution-.5,base=floor(q),f=fract(q);vec3 sum=vec3(0.);float weights=0.;vec3 closest=vec3(0.);float best=1e8;
 for(int y=0;y<2;y++)for(int x=0;x<2;x++){vec2 offset=vec2(float(x),float(y));vec4 tap=texture2D(fogImage,(base+offset+.5)/fogResolution);float error=abs(tap.a-depthZ);if(error<best){best=error;closest=tap.rgb;}float spatial=(x==0?1.-f.x:f.x)*(y==0?1.-f.y:f.y);float w=spatial*exp(-error/max(.08,depthZ*.015));sum+=tap.rgb*w;weights+=w;}return weights>.00001?sum/weights:closest;}
 `;
 post.fragmentShader=post.fragmentShader.replace(' vec3 integrateFog',upsample+' vec3 integrateFog').replace('+streetScattering(ray,min(60.,visibleDistance))+torchScattering(ray,min(60.,visibleDistance))+beaconScattering(ray,visibleDistance)+beaconCore(ray,visibleDistance)+vehicleScattering(ray,min(45.,visibleDistance))','+upsampleFog(distanceZ)+beaconCore(ray,visibleDistance)');
}
function resizeFogPass(w,h,high){const scale=high?.67:.5;fogTarget.setSize(Math.max(2,Math.ceil(w*scale)),Math.max(2,Math.ceil(h*scale)));post.uniforms.fogResolution.value.set(fogTarget.width,fogTarget.height);}
function renderFogPass(){renderer.setRenderTarget(fogTarget);renderer.render(fogScene,postCam);renderer.setRenderTarget(null);}
