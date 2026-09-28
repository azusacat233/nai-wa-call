// Equipment follows the user's front / side / back reference; coordinates face -Z.
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
const cloth=new THREE.MeshStandardMaterial({color:0x827b56,roughness:.95});
const shell=new THREE.MeshStandardMaterial({color:0x767053,roughness:.85});
const trim=new THREE.MeshStandardMaterial({color:0x514f36,roughness:.9});
const metal=new THREE.MeshStandardMaterial({color:0x30332d,roughness:.65,metalness:.45});
const boxCache=new Map();
function box(parent,w,h,d,x,y,z,m=cloth){
 const key=[w,h,d].join(',');if(!boxCache.has(key))boxCache.set(key,new RoundedBoxGeometry(w,h,d,2,Math.min(w,h,d)*.18));
 const mesh=new THREE.Mesh(boxCache.get(key),m);mesh.position.set(x,y,z);parent.add(mesh);return mesh;
}
function strap(parent,points,width=.025,m=trim){
 const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
 const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,16,width/2,5,false),m);parent.add(mesh);return mesh;
}
const helmetGeo=new THREE.SphereGeometry(1,24,14,0,Math.PI*2,0,Math.PI*.51);
const brimGeo=new THREE.TorusGeometry(.252,.009,6,36);
function plate(parent,z,back=false){
 const outline=new THREE.Shape();outline.moveTo(-.19,-.19);outline.lineTo(.19,-.19);outline.lineTo(.19,.16);outline.lineTo(.13,.29);outline.lineTo(-.13,.29);outline.lineTo(-.19,.16);outline.closePath();
 const geo=new THREE.ExtrudeGeometry(outline,{depth:.025,bevelEnabled:true,bevelSize:.012,bevelThickness:.006,bevelSegments:2,steps:1});
 const p=new THREE.Mesh(geo,shell);p.position.set(0,.03,z);parent.add(p);
 const surface=z+(back?.037:-.018);
 for(let i=0;i<5;i++)box(parent,.32,.022,.015,0,.24-i*.077,surface,cloth);
 return surface;
}
let kitCache;
function compact(group,teamColor){
 group.updateMatrixWorld(true);const batches=new Map();
 group.traverse(o=>{if(o.isMesh){const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);if(!batches.has(o.material))batches.set(o.material,[]);batches.get(o.material).push(g);}});
 return [...batches].map(([material,geos])=>{const geometry=mergeGeometries(geos);geos.forEach(g=>g.dispose());return{geometry,material,team:material===teamColor};});
}
export function addTacticalKit(torsoParent,neckParent,teamColor){
 if(kitCache){for(const [parent,key] of [[torsoParent,'torso'],[neckParent,'neck']])for(const part of kitCache[key])parent.add(new THREE.Mesh(part.geometry,part.team?teamColor:part.material.clone()));return;}
 const torso=new THREE.Group(),neck=new THREE.Group();
 const helmet=new THREE.Group();helmet.name='TacticalHelmet';neck.add(helmet);
 const dome=new THREE.Mesh(helmetGeo,shell);dome.position.y=.227;dome.scale.set(.264,.235,.234);helmet.add(dome);
 const brim=new THREE.Mesh(brimGeo,trim);brim.rotation.x=Math.PI/2;brim.position.y=.226;brim.scale.y=.9;helmet.add(brim);
 box(helmet,.075,.075,.026,0,.292,-.231,trim);
 box(helmet,.037,.045,.015,0,.292,-.252,metal);
 box(helmet,.083,.009,.085,0,.456,0,cloth);
 box(helmet,.23,.055,.014,0,.265,.225,cloth);
 for(const side of [-1,1]){
  box(helmet,.025,.115,.085,side*.246,.17,.035,trim);
  box(helmet,.02,.044,.14,side*.252,.241,-.022,shell);
  for(let j=0;j<5;j++)box(helmet,.022,.019,.008,side*.266,.241,-.071+j*.023,metal);
  strap(neck,[[side*.223,.23,-.078],[side*.216,.03,-.09],[side*.16,-.073,-.14],[side*.06,-.086,-.174]],.021);
  box(neck,.044,.032,.023,side*.19,-.029,-.127,shell);
  strap(torso,[[side*.128,.27,-.33],[side*.235,.405,-.15],[side*.242,.43,.025],[side*.17,.3,.285]],.066,shell);
  strap(torso,[[side*.13,.29,-.34],[side*.235,.43,-.12],[side*.24,.45,.025],[side*.17,.32,.285]],.018,trim);
  box(torso,.067,.037,.032,side*.187,.303,-.3,trim).rotation.z=side*.42;
 }
 strap(neck,[[-.065,-.085,-.175],[0,-.092,-.18],[.065,-.085,-.175]],.02);
 const front=plate(torso,-.382),back=plate(torso,.299,true);
 // Cummerbund webbing wraps the body without changing the character's silhouette.
 for(const y of [-.16,-.075,.01])for(const side of [-1,1]){
  strap(torso,[[side*.17,y,-.366],[side*.36,y,-.24],[side*.455,y,0],[side*.36,y,.25],[side*.17,y,.337]],.029,cloth);
 }
 box(torso,.11,.068,.018,0,.213,front-.015,trim);
 box(torso,.042,.041,.022,0,.213,front-.027,teamColor);
 for(const x of [-.116,0,.116]){
  box(torso,.089,.16,.06,x,-.092,front-.038,shell);
  box(torso,.065,.1,.029,x,.021,front-.04,metal).rotation.z=.1;
  for(const y of [-.125,-.075])box(torso,.093,.02,.012,x,y,front-.074,cloth);
  box(torso,.017,.135,.012,x,-.09,front-.079,trim);
 }
 for(const side of [-1,1]){
  box(torso,.091,.173,.091,side*.313,-.083,-.283,shell);
  box(torso,.08,.061,.013,side*.313,-.021,-.335,cloth);
  box(torso,.022,.033,.018,side*.313,-.085,-.337,trim);
 }
 box(torso,.105,.165,.07,.32,-.055,.245,cloth);
 // Folded monocular on the right helmet rail, matching the side reference.
 const mount=box(helmet,.045,.1,.035,.245,.29,-.092,metal);mount.rotation.z=-.3;
 const optic=new THREE.Mesh(new THREE.CylinderGeometry(.024,.025,.088,12),metal);
 optic.position.set(.276,.343,-.11);optic.rotation.z=-.25;helmet.add(optic);
 kitCache={torso:compact(torso,teamColor),neck:compact(neck,teamColor)};
 addTacticalKit(torsoParent,neckParent,teamColor);
}
