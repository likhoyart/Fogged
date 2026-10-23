'use strict';
// A zero-contribution light cannot affect the BRDF. Avoid evaluating all 18 lights at every surface.
THREE.ShaderChunk.lights_fragment_begin=THREE.ShaderChunk.lights_fragment_begin.replaceAll('RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );','if ( directLight.visible ) { RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight ); }');
const visibleTreeBatches=[];let lastTreeX=Infinity,lastTreeZ=Infinity;
function prepareTreeVisibility(){
 for(const shadow of treeBatches){
  const main=new THREE.InstancedMesh(shadow.geometry,shadow.material,shadow.count);main.name='visible_tree_cell';main.userData.importedAsset=true;main.receiveShadow=true;main.castShadow=false;main.frustumCulled=true;
  const matrices=Array.from({length:shadow.count},(_,i)=>{const m=new THREE.Matrix4();shadow.getMatrixAt(i,m);return m;});
  // Original instances remain for each shadow camera. Only the normal camera draw is suppressed.
  shadow.onBeforeRender=function(){this.userData.shadowCount=this.count;this.count=0;};shadow.onAfterRender=function(){this.count=this.userData.shadowCount;};
  main.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(main);visibleTreeBatches.push({main,matrices});
 }
 updateTreeVisibility();
}
function updateTreeVisibility(){
 if(Math.hypot(camera.position.x-lastTreeX,camera.position.z-lastTreeZ)<.5)return;lastTreeX=camera.position.x;lastTreeZ=camera.position.z;
 for(const batch of visibleTreeBatches){let n=0;for(const m of batch.matrices){const e=m.elements;if(Math.hypot(e[12]-lastTreeX,e[14]-lastTreeZ)<55)batch.main.setMatrixAt(n++,m);}batch.main.count=n;batch.main.visible=n>0;batch.main.instanceMatrix.needsUpdate=true;if(n)batch.main.computeBoundingSphere();}
}
