import {buildOptic} from './optics.js';
import * as THREE from 'three';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';
import {mat,camoMaterial} from './materials.js';
let template;
export async function loadHK416(renderer){
 const base=new URL('../assets/weapons/HK416D/',import.meta.url).href;
 const manager=new THREE.LoadingManager();
 manager.setURLModifier(()=>base+'hk416d005_low_02___Default_BaseColor.png');
 const res=await fetch(base+'hk416d005_low.fbx');
 if(!res.ok)throw new Error('HK416D model '+res.status);
 template=new FBXLoader(manager).parse(await res.arrayBuffer(),base);
 const loader=new THREE.TextureLoader();
 const [map,normalMap,metalnessMap,roughnessMap]=await Promise.all(['BaseColor','Normal','Metallic','Roughness'].map(n=>loader.loadAsync(base+'hk416d005_low_02___Default_'+n+'.png')));
 map.colorSpace=THREE.SRGBColorSpace;
 for(const t of [map,normalMap,metalnessMap,roughnessMap])t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 const material=new THREE.MeshStandardMaterial({map,normalMap,metalnessMap,roughnessMap,metalness:1,roughness:1});
 const response=await fetch(base+'reload-parts.json');
 if(!response.ok)throw new Error('HK416D reload mesh data missing');
 const parts=await response.json(),normalized=new THREE.Group(),magazine=new THREE.Group();
 magazine.name='ReloadMagazine';magazine.position.set(-.0017,-.015,-.05);normalized.add(magazine);
 template.updateMatrixWorld(true);
 const transform=new THREE.Matrix4().compose(new THREE.Vector3(-.0017,-.135,-.05),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI/2),new THREE.Vector3(.01,.01,.01));
 template.traverse(o=>{if(!o.isMesh)return;
   const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry,selected=new Set(parts[o.name]||[]),body=[],mag=[];
   for(let i=0;i<g.attributes.position.count;i+=3)(selected.has(i)?mag:body).push(i,i+1,i+2);
   for(const [vertices,parent] of [[body,normalized],[mag,magazine]]){
     if(!vertices.length)continue;const geometry=new THREE.BufferGeometry();
     for(const [name,a] of Object.entries(g.attributes)){
       const array=new a.array.constructor(vertices.length*a.itemSize);
       for(let i=0;i<vertices.length;i++)for(let j=0;j<a.itemSize;j++)array[i*a.itemSize+j]=a.array[vertices[i]*a.itemSize+j];
       geometry.setAttribute(name,new THREE.BufferAttribute(array,a.itemSize,a.normalized));
     }
     geometry.applyMatrix4(o.matrixWorld).applyMatrix4(transform);
     if(parent===magazine)geometry.translate(-magazine.position.x,-magazine.position.y,-magazine.position.z);
     geometry.userData.shared=true;const mesh=new THREE.Mesh(geometry,material);mesh.name=o.name;parent.add(mesh);
   }
 });
 template=normalized;
}
export function buildHK416(att={},camo='none',opts={}){
 if(!template)throw new Error('HK416D has not loaded');
 const root=new THREE.Group(),model=template.clone(true);
 model.traverse(o=>{if(o.isMesh){o.material=camo==='none'?o.material:camoMaterial(camo,o.material);o.castShadow=!opts.noShadow;o.receiveShadow=false;}});
 root.add(model);
 const info={group:root,muzzle:new THREE.Object3D(),sight:new THREE.Vector3(0,.108,.13),mag:null,leftHand:new THREE.Vector3(0,-.03,-.22),eject:new THREE.Vector3(.03,.035,-.035),optic:'iron',reticle:null};
 info.mag=model.getObjectByName('ReloadMagazine');
 info.boltRelease=new THREE.Vector3(-.032,.006,-.025);
 const metal=mat('gunMetal'),railY=.077,zRear=.11,recv=.28,hz0=-.04,hz1=-.31,hand=.27,def={},low=!!opts.low;
 const bgeo=(w,h,d)=>new THREE.BoxGeometry(w,h,d);
 const cgeo=(a,b,l,n=14)=>new THREE.CylinderGeometry(a,b,l,n).rotateX(Math.PI/2);
 const add=(geo,m,x,y,z,rx=0,ry=0,rz=0,parent=root)=>{const mesh=new THREE.Mesh(geo,m);mesh.position.set(x,y,z);mesh.rotation.set(rx,ry,rz);mesh.castShadow=!opts.noShadow;parent.add(mesh);return mesh;};
 const addLaser=(fn,x,y,z)=>fn(new THREE.CircleGeometry(.004,8),mat('laserDot'),x,y,z,0,Math.PI,0);
 let muzzleZ=-.514;
 if(att.muzzle){const length=att.muzzle==='suppressor'?.19:.06;add(cgeo(att.muzzle==='suppressor'?.022:.017,.019,length),metal,0,.035,muzzleZ-length/2);muzzleZ-=length;}
 info.muzzle.position.set(0,.035,muzzleZ);root.add(info.muzzle);
   // 机械瞄具
  const optic = att.optic || (def.defaultOptic && !att.optic ? def.defaultOptic : null);
  const sightY = railY + 0.035;
  if (!optic) {
    add(bgeo(0.004, 0.035, 0.006), metal, 0, railY + 0.02, hz1 + 0.02);
    add(bgeo(0.02, 0.012, 0.012), metal, 0, railY + 0.006, hz1 + 0.02);
    add(bgeo(0.022, 0.022, 0.016), metal, 0, railY + 0.02, zRear - 0.02);
    info.sight.set(0, railY + 0.034, zRear + 0.13);
  }
  // 瞄具
  info.optic = optic || 'iron';
  const oz = zRear - recv * 0.45;
  if (optic) buildOptic(root, info, optic, railY, oz);
  // 激光
  if (att.laser) {
    add(bgeo(0.022, 0.025, 0.06), mat('gunPoly'), 0.038, 0.03, hz1 + 0.05);
    addLaser(add, 0.038, 0.03, hz1 + 0.019);
  }
  // 下挂
  if (att.under === 'vgrip') add(bgeo(0.03, 0.09, 0.03), mat('gunPoly'), 0, -0.035, hz0 - hand * 0.55);
  else if (att.under === 'agrip') add(bgeo(0.03, 0.035, 0.08), mat('gunPoly'), 0, -0.01, hz0 - hand * 0.5, -0.4);
  else if (att.under === 'bipod') {
    add(bgeo(0.035, 0.02, 0.03), metal, 0, -0.005, hz1 + 0.03);
    add(cgeo(0.006, 0.006, 0.16), metal, -0.012, -0.015, hz1 + 0.1, -0.12);
    add(cgeo(0.006, 0.006, 0.16), metal, 0.012, -0.015, hz1 + 0.1, -0.12);
  }
  if (att.under) info.leftHand.set(0, -0.06, hz0 - hand * 0.55);

 if(att.rear)add(bgeo(.029,.068,.036),mat('rubber'),0,-.055,.046,.25);
 return info;
}
