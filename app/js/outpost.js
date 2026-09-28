import * as THREE from 'three';
import {mat} from './materials.js';
const V=(x,z,y=0)=>new THREE.Vector3(x,y,z);

function sign(w,text,x,y,z,width=4,rotation=0,color='#d5dbd4'){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#192b30';ctx.fillRect(0,0,512,128);ctx.fillStyle='#d6aa5a';ctx.fillRect(0,0,12,128);ctx.fillStyle=color;ctx.font='bold 53px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,262,66,470);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const m=new THREE.MeshStandardMaterial({map:texture,roughness:.65,metalness:.15});
  const mesh=w.mesh(new THREE.PlaneGeometry(width,width/4),m,x,y,z,{rotY:rotation});return mesh;
}
function building(w,x,z,width,depth,h,skin){
  const x0=x-width/2,x1=x+width/2,z0=z-depth/2,z1=z+depth/2;
  w.wall(x0,z0,x1,z0,h,.35,skin,[{c:width/2,w:3.4}]);
  w.wall(x0,z1,x1,z1,h,.35,skin,[{c:width/2,w:3.4}]);
  w.wall(x0,z0,x0,z1,h,.35,skin,[{c:depth/2,w:3.4}]);
  w.wall(x1,z0,x1,z1,h,.35,skin,[{c:depth/2,w:3.4}]);
  w.box(x,h,z,width+.5,.22,depth+.5,'metalRoof');
  w.box(x,.01,z,width-.4,.03,depth-.4,'tiles',{collide:false});
  for(const xx of [x0,x1])for(const zz of [z0,z1])w.box(xx,-.02,zz,.48,h+.3,.48,'concreteDark');
  for(const zz of [z0-.23,z1+.23])w.box(x,2.8,zz,width,.22,.05,'containerBlue',{collide:false});
  for(const xx of [x0-.21,x1+.21])w.box(xx,2.8,z,.05,.22,depth,'containerBlue',{collide:false});
  w.pointLight(x,h-.4,z,0xffd4a0,8,12);
}

export function buildOutpost(w){
  w.ground('sand',86);
  w.box(-110,-3,0,300,2,600,'dirt',{collide:false,texScale:7});
  // A 72 × 82 m arena. Solid outer walls and gates keep all play on land.
  w.collider(-44,-2,-44,-36,20,44);w.collider(36,-2,-44,44,20,44);
  w.collider(-44,-2,-44,44,20,-41);w.collider(-44,-2,41,44,20,44);
  for(const x of [-35.5,35.5])w.box(x,0,0,.45,1.25,82,'concreteDark');
  for(const z of [-40.5,40.5]){w.box(0,0,z,72,2.6,.5,'concrete');sign(w,'NAIWA / COASTAL COMMAND',0,3,z+(z<0?.28:-.28),10,z<0?0:Math.PI);}
  // Three longitudinal lanes, linked by cross routes at both ends and mid-map.
  w.box(0,.015,0,13,.02,79,'asphalt',{collide:false});
  for(const x of [-24,24])w.box(x,.015,0,12,.02,79,'concrete',{collide:false});
  for(const z of [-25,25])w.box(0,.02,z,68,.02,7,'asphalt',{collide:false});
  for(let z=-37;z<40;z+=7)for(const x of [-5.5,5.5])w.box(x,.043,z,.13,.008,3,'yellowPaint',{collide:false});
  for(const z of [-24,24])for(let x=-5;x<=5;x+=2)w.box(x,.045,z,.8,.01,3.4,'whitePaint',{collide:false});
  // Central radar station: four doors, useful interior and two exposed roof approaches.
  building(w,0,0,14,12,3.7,'plasterWhite');
  sign(w,'03 / RADAR CONTROL',0,2.65,-6.2,5,Math.PI);
  sign(w,'RADAR / CONTROL',0,2.65,6.2,5);
  w.box(-3.7,0,1.5,3,1.05,1.2,'darkMetal');w.box(3.7,0,-1.5,3,1.05,1.2,'darkMetal');
  for(const x of [-3.7,3.7]){w.box(x,1.05,x<0?1.5:-1.5,1.9,.5,.12,'windowLit',{collide:false});}
  for(const x of [-10,10]){w.stairs(x,0,3,12,3.7,x<0?'s':'n','concrete');w.box(x<0?-7.75:7.75,3.7,x<0?5:-5,1.65,.22,2,'metalRoof');}
  for(const z of [-5.8,5.8])w.box(0,3.92,z,10,.72,.25,'concreteDark');
  const radar=new THREE.Group();radar.position.set(0,4,0);w.root.add(radar);
  w.mesh(new THREE.CylinderGeometry(.35,.55,3,12),'steel',0,1.5,0,{parent:radar});
  const dish=new THREE.Group();dish.position.y=3.2;radar.add(dish);
  const surface=new THREE.Mesh(new THREE.SphereGeometry(2.35,24,12,0,Math.PI*2,0,.65),new THREE.MeshStandardMaterial({color:0xc5d1cb,metalness:.55,roughness:.42,side:THREE.DoubleSide}));surface.rotation.x=Math.PI/2+.4;dish.add(surface);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1.42,.045,6,32),mat('darkMetal'));ring.position.z=1.83;ring.rotation.x=.4;dish.add(ring);
  w.animated.push((t)=>{dish.rotation.y=t*.16;});
  // Western warehouse: side doors prevent a single corridor from dominating.
  building(w,-25,0,13,23,4.7,'plasterBlue');
  sign(w,'01 / LOGISTICS',-25,3.2,11.72,7);
  for(const z of [-7,7]){w.crateStack(-28,z);w.crate(-22,z,1.3);}
  for(let z=-11;z<12;z+=3)w.box(-25,4.9,z,14,.12,.16,'steel',{collide:false});
  // Eastern flank overlooks the sea. Offset equipment breaks long sight lines.
  for(const [x,z] of [[26,-10],[25,11]]){w.tank(x,z,2.2,3.8,'metal');w.box(x,0,z,5,.22,5,'concreteDark');w.pipe(x-3,z-2,x-3,z+2,1,.15);}
  for(const [x,z,rot] of [[20,-17,0],[28,20,Math.PI/2],[-23,-20,0],[-22,20,Math.PI/2]]){w.container(x,z,rot,'containerGreen');}
  // Spawn cover + staging rooms. No direct north-to-south spawn line of sight.
  for(const z of [-34,34]){
    const s=Math.sign(z);w.building(-17,z,10,7,3.2,{mat:'plasterWhite',doors:{n:[0],s:[0],e:[0]},windows:{w:[0]},roofMat:'metalRoof'});
    w.container(18,z,0,'containerBlue');w.barrier(-4,z-s*3);w.barrier(6,z-s*5);w.sandbags(-9,z-s*8,5,0,1);
    w.truck(26,z-s*5,Math.PI/2,0x666f5c);w.truckCollider(26,z-s*5,Math.PI/2);
    for(const x of [-31,31])w.lampPost(x,z-s*3,0xffda9e,0,13,false);
  }
  for(const [x,z] of [[-4,-17],[5,17],[-15,-13],[15,13],[-16,12],[16,-12]]){w.jersey(x,z);w.crate(x+2,z+1,1.2);}
  for(const [x,z] of [[-31,-26],[-31,27],[32,4],[32,-23]]){w.barrel(x,z,'containerOrange');w.barrel(x+1,z+.6,'containerGray');}
  // Seaward rail, rocks, animated water and a distant navigation beacon.
  for(let z=-39;z<=39;z+=3){w.box(35.5,1.2,z,.07,1,.07,'steel',{collide:false});}
  w.box(35.5,2,0,.06,.06,80,'steel',{collide:false});w.box(35.5,1.6,0,.06,.05,80,'steel',{collide:false});
  const waterMat=new THREE.ShaderMaterial({uniforms:{time:{value:0}},vertexShader:'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform float time;varying vec3 p;void main(){float a=sin(p.x*.45+time*.7)*sin(p.y*.28-time*.4);float b=pow(max(0.,sin(p.x*1.7+p.y*.6+time)),18.);vec3 c=mix(vec3(.025,.19,.23),vec3(.12,.40,.44),a*.5+.5)+b*.07;gl_FragColor=vec4(c,1.);}'});
  const sea=w.mesh(new THREE.PlaneGeometry(360,600),waterMat,221,-.9,0,{cast:false});sea.rotation.x=-Math.PI/2;w.animated.push(t=>waterMat.uniforms.time.value=t);
  for(let z=-55;z<60;z+=9)w.rock(42,z,3,'rock',false);
  for(let z=-45;z<48;z+=12){w.rock(-44,z,4,'rock',false);w.tree(-42,z,1.3,'pine');}
  w.mesh(new THREE.CylinderGeometry(1.4,2.2,12,12),'plasterWhite',67,4,-58,{cast:false});w.mesh(new THREE.CylinderGeometry(2,2,.6,12),'redPaint',67,10.4,-58,{cast:false});
  w.spawns.A=[V(-29,-36),V(-9,-36),V(0,-37),V(9,-36),V(28,-37),V(-28,-30)];
  w.spawns.B=[V(-29,36),V(-9,36),V(0,37),V(9,36),V(28,37),V(-28,30)];
  w.flagPos=[V(-25,0),V(0,0),V(23,0)];
}

export function prepareOutpost(w){
  const points=[];for(let z=1;z<w.gn-1;z++)for(let x=1;x<w.gn-1;x++)if(w.walkable(x,z))points.push(V((x+.5)*w.cs-w.half,(z+.5)*w.cs-w.half));
  const nearest=(x,z)=>points.reduce((a,b)=>Math.hypot(b.x-x,b.z-z)<Math.hypot(a.x-x,a.z-z)?b:a).clone();
  w.navPoints=points;w.navNearest=nearest;
  for(const team of ['A','B'])w.spawns[team]=w.spawns[team].map(p=>nearest(p.x,p.z));
  w.spawns.ffa=[...w.spawns.A,...w.spawns.B,nearest(-26,0),nearest(24,0)];
  w.flagPos=w.flagPos.map(p=>nearest(p.x,p.z));w.laptopPos=nearest(3,0);w.lzPos=w.spawns.A[0].clone();w.ammoCrate=nearest(-3,0);
}
