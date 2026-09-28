import * as THREE from 'three';
const smooth=(a,b,t)=>{const k=Math.max(0,Math.min(1,(t-a)/(b-a)));return k*k*(3-2*k);};

export function resetReloadPose(slot){
  const mag=slot?.info.mag;
  if(mag?.userData.reloadBase){mag.position.copy(mag.userData.reloadBase);mag.rotation.copy(mag.userData.reloadRotation);mag.visible=true;}
  const rig=slot?.arms?.userData.leftRig;if(rig)rig.setPose(rig.rest,.5);
}

export function animateReload(slot,k,empty){
  const info=slot.info,mag=info.mag,rig=slot.arms?.userData.leftRig;
  if(!mag||!rig)return;
  if(!mag.userData.reloadBase){mag.userData.reloadBase=mag.position.clone();mag.userData.reloadRotation=mag.rotation.clone();}
  const base=mag.userData.reloadBase,hand=rig.rest.clone(),offset=new THREE.Vector3();
  // Pull the original textured magazine out; retrieve the replacement below view.
  if(k<.4){const pull=smooth(.18,.4,k);offset.set(-.09*pull,-.30*pull,.045*pull);}
  else if(k<.51){offset.set(-.10,-.30,.045);}
  else{const insert=1-smooth(.51,.70,k);offset.set(-.10*insert,-.30*insert,.045*insert);}
  mag.position.copy(base).add(offset);mag.rotation.copy(mag.userData.reloadRotation);mag.rotation.z-=smooth(.18,.4,k)*(1-smooth(.51,.70,k))*.22;
  mag.visible=!(k>=.40&&k<.49);
  const grip=mag.position.clone().add(new THREE.Vector3(-.032,-.066,.002));
  if(k<.18)hand.lerp(grip,smooth(0,.18,k));
  else if(k<.73)hand.copy(grip);
  else if(empty&&info.boltRelease){
    const seated=base.clone().add(new THREE.Vector3(-.032,-.066,.002));
    hand.copy(seated).lerp(info.boltRelease,smooth(.73,.83,k));
    hand.x+=Math.sin(smooth(.83,.88,k)*Math.PI)*.012;
    hand.lerp(rig.rest,smooth(.88,1,k));
  }else hand.copy(grip).lerp(rig.rest,smooth(.73,1,k));
  rig.setPose(hand,.5*(1-smooth(0,.18,k))+smooth(.88,1,k)*.5);
}
