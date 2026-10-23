'use strict';
// Continuous world-space surface. Approved Poly Haven CC0 scans are embedded for offline use.
const terrainTextures={};let terrainMesh;const terrainCells=[];
function terrainNoise(x,z){return .5+.24*Math.sin(x*.37+Math.sin(z*.21))+.18*Math.sin(z*.49-x*.17)+.08*Math.sin(x*1.73+z*1.31);}
function roadSignedDistance(x,z){let d=Infinity;for(const r of roadRects){const dx=Math.abs(x-r[0]-r[2]/2)-r[2]/2,dz=Math.abs(z-r[1]-r[3]/2)-r[3]/2;d=Math.min(d,Math.hypot(Math.max(dx,0),Math.max(dz,0))+Math.min(Math.max(dx,dz),0));}return d;}
function terrainFields(x,z){
 const n=terrainNoise(x,z),d=roadSignedDistance(x,z)+(n-.5)*.85;
 const asphalt=1-THREE.MathUtils.smoothstep(d,-.7,.5);
 const pathDist=Math.abs(z-(x+40)*.65)/1.193;
 const route=(1-THREE.MathUtils.smoothstep(pathDist+n*.65,1.05,2.8))*THREE.MathUtils.smoothstep(x,-84,-79)*(1-THREE.MathUtils.smoothstep(x,-27,-22));
 const clearing=1-THREE.MathUtils.smoothstep(Math.hypot(x+77,z+28),3.4,6.5);
 const wear=Math.max(route,clearing)*.84;
 const lawn=THREE.MathUtils.smoothstep(d,.05,2.2)*(.38+.62*THREE.MathUtils.smoothstep(n,.24,.76))*(1-wear);
 return {asphalt,lawn,wear,n};
}
function footstepSurface(x,z,previous){
 const f=terrainFields(x,z);
 if(f.asphalt>(previous==='asphalt'?.42:.58))return 'asphalt';
 if(f.wear>.45)return 'ground';
 return f.lawn>(previous==='grass'?.24:.32)?'grass':'ground';
}
async function loadTerrainTextures(){const loader=new THREE.TextureLoader();await Promise.all(Object.entries(TERRAIN_ASSETS).map(async([name,data])=>{const maps={};await Promise.all(Object.entries(data).map(async([key,url])=>{const t=await loader.loadAsync(url);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());if(key==='map')t.colorSpace=THREE.SRGBColorSpace;maps[key]=t;}));terrainTextures[name]=maps;}));}
function buildTerrain(){
 const m=new THREE.MeshStandardMaterial({map:materials.asphalt.map,normalMap:materials.asphalt.normalMap,roughness:.94,metalness:0,envMapIntensity:.16});
 m.name='blended_lawn_soil_asphalt';
 m.onBeforeCompile=s=>{
  for(const [name,maps] of Object.entries(terrainTextures)){s.uniforms[name+'Map']={value:maps.map};s.uniforms[name+'Normal']={value:maps.normalMap};}
  s.vertexShader='varying vec2 terrainXZ;\n'+s.vertexShader;
  s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n terrainXZ=(modelMatrix*vec4(position,1.0)).xz;');
  s.fragmentShader=`varying vec2 terrainXZ;
 uniform sampler2D leafyMap,sparseMap,pathMap,leafyNormal,sparseNormal,pathNormal;
 float terrainNoise(vec2 p){return .5+.24*sin(p.x*.37+sin(p.y*.21))+.18*sin(p.y*.49-p.x*.17)+.08*sin(p.x*1.73+p.y*1.31);}
 float rectDist(vec2 p,vec4 r){vec2 q=abs(p-r.xy-r.zw*.5)-r.zw*.5;return length(max(q,0.0))+min(max(q.x,q.y),0.0);}
 `+s.fragmentShader;
  // Noise is fixed to the ground; no animated screen-space grain or alpha sheets.
  s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`
 vec2 p=terrainXZ;
 float n=terrainNoise(p),d=1e5;
 ${roadRects.map(r=>'d=min(d,rectDist(p,vec4('+r.map(v=>v.toFixed(3)).join(',')+')));').join('\n')}
 d+=(n-.5)*.85;
 float paved=1.0-smoothstep(-.7,.5,d);
 float route=(1.0-smoothstep(1.05,2.8,abs(p.y-(p.x+40.0)*.65)/1.193+n*.65))*smoothstep(-84.0,-79.0,p.x)*(1.0-smoothstep(-27.0,-22.0,p.x));
 float wear=max(route,1.0-smoothstep(3.4,6.5,length(p+vec2(77.0,28.0))))*.84;
 float lawn=smoothstep(.05,2.2,d)*(.38+.62*smoothstep(.24,.76,n))*(1.0-wear);
 vec2 groundUV=p*.5;
 // A second, offset scale breaks the recognizable two-metre repeat.
 vec2 detailUV=p*.317+vec2(.37,.61);
 float alternate=smoothstep(.25,.75,terrainNoise(p*.39));
 vec3 leafy=mix(texture2D(leafyMap,groundUV).rgb,texture2D(leafyMap,detailUV).rgb,alternate*.45);
 vec3 sparse=mix(texture2D(sparseMap,groundUV).rgb,texture2D(sparseMap,detailUV).rgb,alternate*.45);
 vec3 dirt=texture2D(pathMap,p).rgb;
 vec3 soil=mix(mix(sparse*vec3(.88,.96,.88),leafy*vec3(.65,.79,.61),lawn),dirt*.56,wear);
 soil*=.88+.16*n;
 diffuseColor.rgb*=mix(soil,texture2D(map,p/2.4).rgb*vec3(.175,.191,.178),paved);
 `);
  s.fragmentShader=s.fragmentShader.replace('#include <roughnessmap_fragment>','float roughnessFactor=mix(.97,.91,paved);');
  s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_maps>',`
 vec3 ln=mix(texture2D(leafyNormal,groundUV).xyz,texture2D(leafyNormal,detailUV).xyz,alternate*.45)*2.0-1.0;
 vec3 sn=mix(texture2D(sparseNormal,groundUV).xyz,texture2D(sparseNormal,detailUV).xyz,alternate*.45)*2.0-1.0;
 vec3 gn=mix(mix(sn,ln,lawn),texture2D(pathNormal,p).xyz*2.0-1.0,wear);
 gn.xy*=.4;
 vec3 an=texture2D(normalMap,p/2.4).xyz*2.0-1.0;an.xy*=.55;
 normal=normalize(getTangentFrame(-vViewPosition,normal,groundUV)*normalize(mix(gn,an,paved)));
 `);
  applyWaterSurfaceToTerrain(s);
 };
 m.customProgramCacheKey=()=> 'terrain-approved-water-v20';
 // Extends far beyond the walkable perimeter; its outer rectangle is never exposed.
 const g=new THREE.PlaneGeometry(480,420,240,210);g.rotateX(-Math.PI/2);g.translate(0,0,-25);
 const a=g.attributes.position;for(let i=0;i<a.count;i++){const f=terrainFields(a.getX(i),a.getZ(i));a.setY(i,(terrainNoise(a.getX(i)*.7,a.getZ(i)*.7)-.5)*.028*(1-f.asphalt));}g.computeVertexNormals();
 terrainMesh=new THREE.Mesh(g,m);terrainMesh.name='continuous_terrain';terrainMesh.receiveShadow=true;terrainMesh.userData.atmosphere=true;
 // Share the exact source grid and normals; draw only local ground tiles. Raycasts use the original mesh.
 for(let z=0;z<210;z+=12)for(let x=0;x<240;x+=12){const tile=new THREE.BufferGeometry();tile.attributes=g.attributes;const indices=[];for(let iz=z;iz<Math.min(210,z+12);iz++)for(let ix=x;ix<Math.min(240,x+12);ix++){const offset=(iz*240+ix)*6;for(let k=0;k<6;k++)indices.push(g.index.array[offset+k]);}tile.setIndex(indices);
 const min=new THREE.Vector3(Infinity,Infinity,Infinity),max=new THREE.Vector3(-Infinity,-Infinity,-Infinity),v=new THREE.Vector3();for(const i of indices){v.fromBufferAttribute(g.attributes.position,i);min.min(v);max.max(v);}tile.boundingBox=new THREE.Box3(min,max);tile.boundingSphere=tile.boundingBox.getBoundingSphere(new THREE.Sphere());const mesh=new THREE.Mesh(tile,m);mesh.name='terrain_tile';mesh.receiveShadow=true;mesh.userData.atmosphere=true;scene.add(mesh);terrainCells.push(mesh);}

}

function terrainHeightAt(x,z){terrainMesh.updateMatrixWorld(true);const ray=new THREE.Raycaster(new THREE.Vector3(x,5,z),new THREE.Vector3(0,-1,0),0,10);const hits=ray.intersectObject(terrainMesh,false);if(!hits.length)throw new Error('Missing terrain below tree');return hits[0].point.y;}

function animateTerrain(){for(const mesh of terrainCells){const s=mesh.geometry.boundingSphere;mesh.visible=Math.hypot(s.center.x-camera.position.x,s.center.z-camera.position.z)-s.radius<65;}}
