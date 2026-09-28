import * as THREE from 'three';
import {createSoldierModel,animateSoldier} from './soldier.js';
import {mat} from './materials.js';
export function addLobbyStage(menu){
 const s=menu.scene3d,group=new THREE.Group();s.add(group);menu.outdoor=group;
 const m=new THREE.MeshStandardMaterial({color:0x283a3a,roughness:.8});
 function box(w,h,d,x,y,z,material=m){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;}
 box(14,.12,18,0,-.07,-3,mat('concreteDark'));
 // A wet staging apron, distant freight sheds, utility poles and barriers.
 for(const [x,z] of [[-5,-5],[5,-7],[-7,-12],[8,-13]]){
  box(3.4,2.5,2.6,x,1.25,z);
  for(let j=0;j<10;j++)box(.045,2.45,.045,x-1.5+j*.32,1.25,z+1.32);
 }
 const steel=new THREE.MeshStandardMaterial({color:0x233334,roughness:.7,metalness:.4});
 for(const [x,z] of [[-4.6,-3.4],[4,-5],[7,-11]]){
  box(.11,7,.11,x,3.5,z,steel);box(2,.09,.1,x,6.5,z,steel);
  for(const dx of [-.8,.8]){
   const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(x+dx,6.5,z),new THREE.Vector3(x+dx+4,5.7,z-4),new THREE.Vector3(x+dx+8,6.3,z-8)]);
   group.add(new THREE.Mesh(new THREE.TubeGeometry(curve,16,.008,4,false),steel));
  }
 }
 for(let i=0;i<7;i++)box(.8,.11,.02,-2.4+i*.83,.011,-1.2,mat('gunTan')).rotation.x=-Math.PI/2;
 const puddleMat=new THREE.MeshStandardMaterial({color:0x475c61,roughness:.18,metalness:.55,transparent:true,opacity:.45});
 for(let i=0;i<12;i++){const p=new THREE.Mesh(new THREE.CircleGeometry(.4+(i%3)*.2,20),puddleMat);p.rotation.x=-Math.PI/2;p.scale.y=.32;p.position.set(Math.sin(i*9)*4,.006,Math.cos(i*7)*3-1);group.add(p);}
 const hemi=new THREE.HemisphereLight(0xb5d1d8,0x364442,1.4);group.add(hemi);
 const sun=new THREE.DirectionalLight(0xd7e6df,2.2);sun.position.set(-3,7,4);group.add(sun);
 menu.squad=[createSoldierModel('ally','hk416',{optic:'reddot'},'none'),createSoldierModel('ally','hk416',{},'none')];
 menu.squad.forEach((p,i)=>{p.root.position.set(i?2.03:-.43,0,-.82);p.root.rotation.y=Math.PI+(i?-.13:.19);s.add(p.root);});
}
export function updateSquad(menu,t,dt){
 if(menu.camKind!=='main')return;
 menu.squad?.forEach((p,i)=>animateSoldier(p,{speed:.4,phase:t*1.2+i*2,crouch:0,pitch:-.1+Math.sin(t*.5+i)*.018,dead:false,recoil:0},dt));
}
