'use strict';
// Fixed world-space lights and targets. No camera-dependent pool or volumetric substitution.
const streetLightSources=[],streetLightPool=[];
const streetFogPositions=Array.from({length:10},()=>new THREE.Vector3(0,-1000,0));
// Triangles of the real diffuser, selected from the original LAMP emissive UV mask.
const streetEmitterIndices=[140,141,114,140,114,146,1385,1386,1387,1385,1387,1388,1388,1389,1390,1388,1387,1391,1388,1391,1389,1392,1393,1385,1392,1385,1394,1393,1395,1386,1393,1386,1385,1395,1396,1386,1386,1396,1397,1386,1397,1387,1387,1397,1398,1387,1398,1391,1391,1398,1399,1389,1391,1399,1389,1399,1400,1390,1389,1400,1390,1400,1401,1402,1388,1390,1394,1385,1388,1394,1388,1402,1403,1404,1405,1403,1405,1406,1404,1407,1408,1404,1408,1405,1406,1405,1409,1406,1409,1410,1405,1408,1411,1405,1411,1409,1401,1400,1403,1401,1403,1412,1400,1404,1403,1400,1399,1407,1400,1407,1404,1399,1413,1407,1407,1413,1414,1407,1414,1408,1408,1414,1411,1411,1414,1415,1411,1415,1416,1409,1411,1416,1409,1416,1417,1410,1409,1417,1410,1417,1418,1419,1410,1418,1419,1418,1420,1421,1406,1410,1421,1410,1419,1412,1403,1406,1412,1406,1421,1422,1423,1424,1422,1424,1425,1425,1426,1427,1425,1424,1428,1425,1428,1426,1420,1418,1422,1418,1417,1422,1417,1416,1423,1417,1423,1422,1416,1415,1429,1416,1429,1423,1423,1429,1430,1423,1430,1424,1424,1430,1431,1424,1431,1428,1428,1431,1432,1428,1432,1433,1426,1428,1433,1426,1433,1434,1427,1426,1434,1427,1434,1435,1436,1425,1427,1420,1422,1425,1420,1425,1436,1437,1438,1439,1437,1439,1440,1438,1441,1442,1438,1442,1439,1440,1439,1443,1440,1443,1444,1439,1442,1445,1439,1445,1443,1427,1435,1437,1427,1437,1446,1435,1434,1438,1435,1438,1437,1434,1433,1441,1434,1441,1438,1433,1432,1441,1441,1432,1447,1441,1447,1442,1442,1447,1448,1442,1448,1445,1445,1448,1396,1445,1396,1395,1443,1445,1395,1443,1395,1393,1444,1443,1393,1392,1444,1393,1449,1440,1444,1449,1444,1392,1446,1437,1440,1446,1440,1449,1450,1451,1452,1450,1452,1453,1451,1454,1455,1451,1455,1452,1453,1452,1456,1453,1456,1457,1452,1455,1458,1452,1458,1456,1415,1414,1450,1415,1450,1429,1414,1451,1450,1414,1413,1454,1414,1454,1451,1413,1399,1398,1413,1398,1454,1454,1398,1397,1454,1397,1455,1455,1397,1396,1455,1396,1458,1458,1396,1448,1456,1458,1448,1456,1448,1447,1457,1456,1447,1457,1447,1432,1431,1457,1432,1430,1453,1457,1430,1457,1431,1429,1450,1453,1429,1453,1430];
function prepareStreetLights(){}
function makeStreetBulb(fixture){
 const source=fixture.children.find(m=>m.isMesh),positions=source.geometry.attributes.position,normals=source.geometry.attributes.normal;
 const points=[];for(const i of streetEmitterIndices){points.push(positions.getX(i)+normals.getX(i)*.003,positions.getY(i)+normals.getY(i)*.003,positions.getZ(i)+normals.getZ(i)*.003);}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));geometry.computeVertexNormals();geometry.computeBoundingBox();
 const material=new THREE.MeshStandardMaterial({color:0xffe6b8,emissive:0xffe2a8,emissiveIntensity:4.5,roughness:.55,side:THREE.DoubleSide});
 const mesh=new THREE.Mesh(geometry,material);mesh.name='street_glowing_bulb';mesh.userData.importedAsset=true;fixture.add(mesh);
 // A rounded luminous bulb protrudes just below the opaque housing.
 const lensCenter=geometry.boundingBox.getCenter(new THREE.Vector3());
 const globe=new THREE.Mesh(new THREE.SphereGeometry(1,16,8),material);globe.name='street_visible_lamp';globe.userData.importedAsset=true;
 globe.scale.set(.29,.075,.145);globe.position.set(lensCenter.x,geometry.boundingBox.min.y-.15,lensCenter.z);fixture.add(globe);
 fixture.updateMatrixWorld(true);const origin=globe.getWorldPosition(new THREE.Vector3());
 return {mesh,origin,material};
}
function streetLamp(x,z,lean){
 const scale=7.2/propTemplates.streetLamp.userData.size[1];const g=putProp('streetLamp',x+1.60,0,z,0,scale,false);g.rotation.z=lean;
 g.updateMatrixWorld(true);const bulbMaterials=[];
 g.traverse(o=>{if(!o.isMesh)return;const clone=m=>{m=m.clone();m.transparent=false;m.opacity=1;m.alphaTest=0;m.depthWrite=true;m.depthTest=true;m.side=THREE.DoubleSide;m.emissiveIntensity=0;return m;};o.material=Array.isArray(o.material)?o.material.map(clone):clone(o.material);});
 const bulb=makeStreetBulb(g);bulbMaterials.push(bulb.material);
 const position=bulb.origin.clone();
 const light=new THREE.SpotLight(0xffdfad,245,16,.70,.55,2);light.position.copy(position);
 // Wide downward cones, fixed to each fixture in world space.
 light.castShadow=false;light.target.position.copy(position).add(new THREE.Vector3(0,-8,0));
 streetFogPositions[streetLightSources.length].copy(position);
 scene.add(light,light.target);streetLightPool.push(light);
 streetLightSources.push({position,light,bulbMaterials,fixture:g,bulb:bulb.mesh,base:245,power:245});
 const base=new THREE.Vector3(-2.04187186,0,0).applyMatrix4(g.matrixWorld);
 colliders.push(new THREE.Box3(new THREE.Vector3(base.x-.14,0,base.z-.14),new THREE.Vector3(base.x+.14,4,base.z+.14)));
}
function animateStreetLights(){ /* Street lights stay constant, including during movement and pause. */ }
