import * as THREE from 'three';
import {VIDEO_STREAKS} from './streak-data.js';
import {explode,fireHitscan} from './combat.js';
import {clamp,raySphere} from './util.js';
import {droneModel,jetModel,wheelsonModel,crateModel} from './streak-models.js';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const definition=id=>VIDEO_STREAKS.find(s=>s.id===id);
const REMOTE=new Set(['bombdrone','cruise','wheelson','chopper','gunship']);
const TARGETED=new Set(['precision','mortar','sae','vtol','stealth']);

export class StreakSystem{
 constructor(mode,factories){
  this.mode=mode;this.game=mode.game;this.factories=factories;this.units=[];this.jobs=[];this.bonus=[];this.advanced={};this.remote=null;this.target=null;this.disposed=false;
  this.overlay=document.createElement('div');this.overlay.id='streak-control';this.overlay.className='hidden';document.body.appendChild(this.overlay);
 }
 schedule(t,fn){this.jobs.push({t,fn});}
 consume(s){s.ready=false;s.used=true;if(s.bonus)this.bonus=this.bonus.filter(x=>x!==s);this.mode.updateStreakHUD();}
 use(i){const s=this.mode.streakState[i];if(s?.ready)this.activate(s);}
 activate(s){
  const g=this.game,pl=g.player,id=s.id;
  if(this.remote||this.target||!pl.alive)return false;
  if(TARGETED.has(id)){this.target={s,points:[]};g.hud.announce('标记'+definition(id).name,'瞄准地面 · 左键确认 · 右键取消',3);return true;}
  if(REMOTE.has(id)){if(id==='wheelson'&&g.world.lineBlocked(pl.eyePos(V()),this.dropPoint().add(V(0,.8,0)))){g.hud.popup('前方空间不足','#f88');return false;}this.remote=new RemoteUnit(this,id);this.units.push(this.remote);}
  else if(id==='uav'||id==='advanced'){
   this.mode.uav[pl.team]=id==='advanced'?45:30;if(id==='advanced')this.advanced[pl.team]=45;
   this.units.push(new AirUnit(this,id,pl.pos.clone(),pl));
  }else if(id==='clustermine'){
   const p=this.dropPoint();for(let i=0;i<5;i++){const a=i*Math.PI*2/5;this.units.push(new Mine(this,p.clone().add(V(Math.cos(a)*1.6,0,Math.sin(a)*1.6)),pl));}
  }else if(['care','emergency','juggernaut'].includes(id)){
   const p=this.dropPoint();for(let i=0;i<(id==='emergency'?3:1);i++)this.units.push(new Supply(this,p.clone().add(V(i*1.6,0,0)),id==='juggernaut'));
  }else if(id==='sentry'){
   const p=this.dropPoint();if(g.world.lineBlocked(pl.eyePos(V()),p.clone().add(V(0,.6,0)))){g.hud.popup('无法在此部署','#f88');return false;}
   this.mode.active.push(this.factories.sentry(p,pl));
  }else if(id==='heli')this.units.push(new AirUnit(this,'heli',pl.pos.clone(),pl));
  else return false;
  this.consume(s);this.announce(id);return true;
 }
 announce(id){this.game.hud.announce(definition(id).name+' 已启动','',2);this.game.audio.say(definition(id).name+'已启动');}
 dropPoint(){const pl=this.game.player,p=pl.pos.clone().addScaledVector(pl.forward(V()).setY(0).normalize(),2.6);p.x=clamp(p.x,-this.game.world.half+2,this.game.world.half-2);p.z=clamp(p.z,-this.game.world.half+2,this.game.world.half-2);p.y=this.game.world.groundHeight(p.x,p.z,pl.pos.y+1,.3);return p;}
 strike(id,points,owner=this.game.player){
  const g=this.game,center=points[0],dir=V(Math.cos(owner.yaw||0),0,-Math.sin(owner.yaw||0));
  const hit=(p,r=6,dmg=200)=>{p.y=g.world.groundHeight(p.x,p.z,100,.1)+.1;explode(g,p,r,dmg,owner,definition(id).name);};
  const aircraft=(t,p,stealth=false)=>this.schedule(t,()=>this.units.push(new Flyby(this,p,dir,stealth)));
  if(id==='precision')for(let pass=0;pass<2;pass++){aircraft(.3+pass*2,center);for(let i=0;i<7;i++)this.schedule(2+pass*2+i*.12,()=>hit(center.clone().addScaledVector(dir,(i-3)*2),4.3,220));}
  else if(id==='mortar')for(let i=0;i<16;i++)this.schedule(2+i*.65,()=>{const p=center.clone().add(V(Math.sin(i*2.4)*5,0,Math.cos(i*1.7)*5));g.effects.tracer(p.clone().add(V(0,35,0)),p,[2,1.5,.6]);hit(p,5,180);});
  else if(id==='sae')points.forEach((p,i)=>{aircraft(i*.8,p);for(let j=0;j<5;j++)this.schedule(2+i*.8+j*.12,()=>hit(p.clone().addScaledVector(dir,(j-2)*2),6,240));});
  else if(id==='stealth'){aircraft(0,center,true);for(let i=0;i<15;i++)for(const side of [-1,1])this.schedule(2+i*.17,()=>hit(center.clone().addScaledVector(dir,(i-7)*3).addScaledVector(V(-dir.z,0,dir.x),side*3),7,260));}
  else if(id==='vtol'){aircraft(0,center);for(let i=0;i<4;i++)this.schedule(2+i*.2,()=>hit(center.clone().addScaledVector(dir,(i-1.5)*3),6,230));this.schedule(3.2,()=>this.units.push(new AirUnit(this,'vtol',center,owner)));}
  this.announce(id);
 }
 updateTarget(inp){
  if(!this.target){if(this.ring)this.ring.visible=false;return;}
  const g=this.game,hit=g.world.raycast(g.camera.position,g.camera.getWorldDirection(V()),220);
  if(!this.ring){this.ring=new THREE.Mesh(new THREE.RingGeometry(2.7,3,40),new THREE.MeshBasicMaterial({color:0xf2bc66,side:THREE.DoubleSide,transparent:true,opacity:.8,depthTest:false}));this.ring.rotation.x=-Math.PI/2;g.scene.add(this.ring);}
  this.ring.visible=!!hit;if(hit)this.ring.position.copy(hit.point).add(V(0,.08,0));
  const t=this.target,need=t.s.id==='sae'?3:1;
  g.hud.prompt(`<b>左键</b>标记 ${t.points.length}/${need} · <b>右键</b>取消`);
  if(inp.adsPressed){this.target=null;g.hud.prompt(null);return;}
  if(inp.firePressed&&hit){t.points.push(hit.point.clone());g.audio.beep(1);if(t.points.length>=need){this.strike(t.s.id,t.points);this.consume(t.s);this.target=null;g.hud.prompt(null);}g.player.ws.cool=.4;}
 }
 award(id){const s={id,ready:true,used:false,bonus:true};this.bonus.push(s);this.game.hud.announce('获得 '+definition(id).name,'按 6 使用空投奖励',3);this.game.audio.say('空投奖励已领取');}
 equipJuggernaut(){
  const pl=this.game.player;if(this.jug)return;
  this.jug={loadout:pl.loadout,maxHp:pl.maxHp,dmgMul:pl.dmgMul};pl.juggernaut=true;pl.maxHp=700;pl.hp=700;pl.dmgMul=.45;
  pl.equip({primary:{id:'jugminigun',att:{},camo:'none'},perks:['eod','coldblooded','amped'],lethal:'frag',tactical:'stim'});
  this.game.hud.announce('无畏机甲已装备','重型护甲 · 转管机枪',3);this.game.audio.say('无畏机甲已装备');
 }
 restoreJug(){if(!this.jug)return;const pl=this.game.player;pl.maxHp=this.jug.maxHp;pl.dmgMul=this.jug.dmgMul;pl.hp=Math.min(pl.hp,pl.maxHp);pl.juggernaut=false;pl.equip(this.jug.loadout);this.jug=null;}
 get interacting(){return !!(this.target||this.remote||this.nearCrate);}
 update(dt,inp){
  if(this.disposed)return;
  const g=this.game,pl=g.player;for(const k in this.advanced)this.advanced[k]=Math.max(0,this.advanced[k]-dt);
  for(const job of this.jobs)job.t-=dt;const due=this.jobs.filter(j=>j.t<=0);this.jobs=this.jobs.filter(j=>j.t>0);for(const job of due)job.fn();
  if(this.jug&&!pl.alive)this.restoreJug();
  if(!inp.interact)this.requireRelease=false;
  this.nearCrate=this.units.filter(u=>u instanceof Supply&&u.alive&&u.pos.y===u.target.y&&pl.pos.distanceTo(u.pos)<2.1).sort((a,b)=>pl.pos.distanceToSquared(a.pos)-pl.pos.distanceToSquared(b.pos))[0]||null;
  for(const unit of [...this.units])if(unit.alive)unit.update(dt,inp);
  this.units=this.units.filter(u=>u.alive);
  if(this.remote&&!this.remote.alive)this.remote=null;
  document.body.classList.toggle('remote-active',!!this.remote);
  if(!this.remote){this.updateTarget(inp);if(inp.bonusPressed&&this.bonus.length)this.activate(this.bonus[0]);}
  this.overlay.classList.toggle('hidden',!this.remote&&!this.jug&&!this.bonus.length);
  if(this.remote)this.overlay.innerHTML=this.remote.hud();
  else if(this.jug)this.overlay.innerHTML=`<div class="jug-visor"></div><div class="streak-readout">无畏机甲 / JUGGERNAUT <b>护甲 ${Math.ceil(pl.hp)} / ${pl.maxHp}</b></div>`;
  else if(this.bonus.length)this.overlay.innerHTML=`<div class="bonus-readout">[6] ${definition(this.bonus[0].id).name} <small>空投奖励 ×${this.bonus.length}</small></div>`;
 }
 dispose(){this.disposed=true;for(const u of [...this.units])u.dispose();this.units=[];this.jobs=[];this.remote=null;this.target=null;this.restoreJug();if(this.ring)this.game.scene.remove(this.ring);this.overlay.remove();document.body.classList.remove('remote-active');}
}

class Unit{
 constructor(sys,mesh,pos,hp=100,radius=.5,owner=sys.game.player){this.sys=sys;this.game=sys.game;this.mesh=mesh;this.pos=pos.clone();this.hp=hp;this.radius=radius;this.owner=owner;this.team=owner.team;this.alive=true;this.isTurret=true;this.name='连杀装置';this.game.scene.add(mesh);mesh.position.copy(pos);this.game.entities.push(this);}
 eyePos(out){return out.copy(this.pos).add(V(0,.4,0));}chestPos(out){return this.eyePos(out);}
 hitTest(o,d,max){const t=raySphere(o.x,o.y,o.z,d.x,d.y,d.z,this.pos.x,this.pos.y+.3,this.pos.z,this.radius);return t>=0&&t<max?{t,part:'body'}:null;}
 takeDamage(dmg,info){if(!this.alive)return false;this.hp-=dmg*(info.explosive?1.5:1);if(this.hp<=0){this.destroy();return true;}return false;}
 destroy(){if(!this.alive)return;this.game.effects.explosion(this.pos,.5);this.game.audio.explosion(this.pos,.4);this.dispose();}
 dispose(){this.alive=false;this.game.scene.remove(this.mesh);this.game.entities=this.game.entities.filter(e=>e!==this);}
}
class Mine extends Unit{
 constructor(sys,pos,owner){pos.y=sys.game.world.groundHeight(pos.x,pos.z,pos.y+2,.2)+.08;super(sys,new THREE.Mesh(new THREE.CylinderGeometry(.2,.22,.1,12),new THREE.MeshStandardMaterial({color:0x454d38})),pos,25,.25,owner);this.age=0;this.name='集束地雷';}
 detonate(){if(!this.alive)return;this.dispose();explode(this.game,this.pos.clone().add(V(0,.1,0)),4.7,160,this.owner,this.name);}
 destroy(){this.detonate();}
 update(dt){this.age+=dt;if(this.age>60){this.dispose();return;}if(this.age<2)return;for(const e of this.sys.mode.enemiesOf(this.team))if(e.alive&&!e.isTurret&&e.pos.distanceTo(this.pos)<2.5&&!this.game.world.lineBlocked(this.pos.clone().add(V(0,.2,0)),e.chestPos(V()))){this.detonate();break;}}
}
class Supply extends Unit{
 constructor(sys,target,jug=false){target.y=sys.game.world.groundHeight(target.x,target.z,80,.3);super(sys,crateModel(),target.clone().add(V(0,30,0)),180,.6);this.target=target;this.jug=jug;this.age=0;this.hold=0;this.name=jug?'无畏机甲空投':'空投补给';}
 update(dt,inp){
  this.age+=dt;if(this.age>100){this.dispose();return;}
  this.pos.y=Math.max(this.target.y,this.pos.y-dt*5);this.mesh.position.copy(this.pos);this.mesh.userData.chute.visible=this.pos.y>this.target.y+.05;
  const pl=this.game.player;
  if(this.sys.nearCrate===this&&pl.alive&&!this.sys.remote){
   this.game.hud.prompt('<b>按住 F</b>领取'+this.name);this.hold=inp.interact&&!this.sys.requireRelease?this.hold+dt:0;this.game.hud.progress(this.hold/1.2);
   if(this.hold>=1.2){this.sys.requireRelease=true;if(this.jug)this.sys.equipJuggernaut();else {const choices=VIDEO_STREAKS.filter(s=>!['care','emergency'].includes(s.id));const weighted=choices.flatMap(s=>Array(Math.max(1,16-s.kills)).fill(s.id));this.sys.award(weighted[Math.floor(Math.random()*weighted.length)]);}this.game.hud.prompt(null);this.game.hud.progress(null);this.dispose();}
  }else if(this.hold){this.hold=0;this.game.hud.progress(null);}
 }
}
class Flyby extends Unit{
 constructor(sys,center,dir,stealth){super(sys,jetModel(stealth),center.clone().addScaledVector(dir,-100).add(V(0,30,0)),1000,2);this.dir=dir.clone();this.age=0;this.mesh.rotation.y=Math.atan2(-dir.x,-dir.z);this.game.audio.whoosh(center);}
 update(dt){this.age+=dt;this.pos.addScaledVector(this.dir,65*dt);this.mesh.position.copy(this.pos);if(this.age>4)this.dispose();}
}
class AirUnit extends Unit{
 constructor(sys,id,center,owner){
  const radar=id==='uav'||id==='advanced',mesh=id==='heli'?sys.factories.heliModel():radar?droneModel():jetModel();
  super(sys,mesh,center.clone().add(V(0,radar?32:24,0)),radar?130:650,radar?1:3,owner);this.id=id;this.center=center.clone();this.radar=radar;this.age=0;this.cool=0;this.name=definition(id).name;
 }
 update(dt){
  this.age+=dt;this.cool-=dt;const duration=this.id==='uav'?30:45;if(this.age>duration){this.dispose();return;}
  if(this.id==='heli'&&this.owner.alive)this.center.lerp(this.owner.pos,dt*.4);
  const a=this.age*.22,r=this.radar?12:9;this.pos.set(this.center.x+Math.cos(a)*r,this.center.y+(this.radar?32:24),this.center.z+Math.sin(a)*r);this.mesh.position.copy(this.pos);this.mesh.rotation.y=-a;
  if(this.mesh.userData.rotor)this.mesh.userData.rotor.rotation.y+=dt*32;
  if(this.radar)return;
  const target=this.sys.mode.enemiesOf(this.team).filter(e=>e.alive&&!e.isTurret&&!(e.isPlayer&&e.hasPerk('coldblooded'))&&!this.game.world.lineBlocked(this.pos,e.chestPos(V()))).sort((a,b)=>a.pos.distanceToSquared(this.pos)-b.pos.distanceToSquared(this.pos))[0];
  if(target&&this.cool<=0){this.cool=.12;const dir=target.chestPos(V()).sub(this.pos).normalize(),stats={dmgNear:23,dmgFar:18,rangeNear:35,rangeFar:100,headMul:1};const r=fireHitscan(this.game,this.owner,this.pos,dir,stats,this.name);this.game.effects.tracer(this.pos,r.point,[2,1.3,.5]);this.game.audio.shot('turret',this.pos);}
 }
 destroy(){if(this.radar){this.sys.mode.uav[this.team]=0;this.sys.advanced[this.team]=0;}super.destroy();}
}

class RemoteUnit extends Unit{
 constructor(sys,id){
  const pl=sys.game.player,air=id==='chopper'||id==='gunship',pos=id==='cruise'?V(pl.pos.x,80,pl.pos.z):air?V(0,id==='gunship'?65:38,sys.game.world.half*.7):pl.pos.clone().addScaledVector(pl.forward(V()).setY(0).normalize(),1.5).add(V(0,id==='bombdrone'?2:0,0));
  super(sys,id==='wheelson'?wheelsonModel():id==='bombdrone'?droneModel():id==='chopper'?sys.factories.heliModel():jetModel(),pos,id==='wheelson'?350:500,id==='wheelson'?.8:2);
  this.id=id;this.name=definition(id).name;this.air=air;this.time=id==='cruise'?12:id==='bombdrone'?30:45;this.yaw=pl.yaw;this.pitch=id==='cruise'?-1.2:air?-.8:0;this.cool=0;this.rocketCool=0;this.rockets=6;this.weapon=0;this.age=0;this.fov=this.game.camera.fov;
  if(air){this.yaw=0;this.pitch=-Math.atan2(pos.y,sys.game.world.half*.7);}
  this.mesh.visible=id==='wheelson';this.game.scopeState=null;this.game.audio.say(this.name+'控制已连接');
 }
 direction(){return V(-Math.sin(this.yaw)*Math.cos(this.pitch),Math.sin(this.pitch),-Math.cos(this.yaw)*Math.cos(this.pitch));}
 impact(radius=9,damage=300){if(!this.alive)return;const p=this.pos.clone();this.dispose();explode(this.game,p,radius,damage,this.owner,this.name);}
 fire(radius=0,dmg=35){const g=this.game,dir=this.direction(),stats={dmgNear:dmg,dmgFar:dmg,rangeNear:80,rangeFar:300,headMul:1};const from=this.pos.clone().add(V(0,this.id==='wheelson'?.9:0,0));const hit=fireHitscan(g,this.owner,from,dir,stats,this.name);g.effects.tracer(from,hit.point,[2,1.6,.7]);g.audio.shot('turret');if(radius)explode(g,hit.point,radius,dmg*2,this.owner,this.name);}
 update(dt,inp){
  const g=this.game;this.time-=dt;this.age+=dt;this.cool-=dt;this.rocketCool-=dt;
  if(!this.owner.alive||this.sys.mode.over||inp.interactPressed||this.time<=0){if(this.id==='cruise'&&this.time<=0)this.impact();else this.dispose();return;}
  this.yaw-=(inp.mdx||0)*.002;this.pitch=clamp(this.pitch-(inp.mdy||0)*.002,this.id==='cruise'?-1.5:-1.45,this.id==='cruise'?-.2:1.3);
  const old=this.pos.clone(),dir=this.direction(),fwd=V(-Math.sin(this.yaw),0,-Math.cos(this.yaw)),right=V(Math.cos(this.yaw),0,-Math.sin(this.yaw));
  if(this.id==='cruise'){
   this.pos.addScaledVector(dir,dt*(inp.fire?52:27));const delta=this.pos.clone().sub(old),hit=g.world.raycast(old,delta.clone().normalize(),delta.length());
   if(hit){this.pos.copy(hit.point);this.impact(11,420);return;}
   if(this.pos.y<=g.world.groundHeight(this.pos.x,this.pos.z,this.pos.y+1,.2)+.3){this.impact(11,420);return;}
  }else if(!this.air){
   const vel=fwd.multiplyScalar((Number(!!inp.fwd)-Number(!!inp.back))*(this.id==='wheelson'?7:9)).addScaledVector(right,(Number(!!inp.right)-Number(!!inp.left))*(this.id==='wheelson'?5:7));
   if(this.id==='bombdrone'){vel.y=(Number(!!g.input.keys.Space)-Number(!!(g.input.keys.ControlLeft||g.input.keys.KeyC)))*6;const delta=vel.clone().multiplyScalar(dt);if(!g.world.raycast(old,delta.clone().normalize(),delta.length()+.2))this.pos.add(delta);if(inp.firePressed){this.impact(8,270);return;}}
   else {this.pos.addScaledVector(vel,dt);g.world.collide(this.pos,vel,.65,1,.2);this.pos.y=g.world.groundHeight(this.pos.x,this.pos.z,this.pos.y+.5,.3);if(inp.fire&&this.cool<=0){this.cool=.10;this.fire(1.4,34);}}
   this.pos.x=clamp(this.pos.x,-g.world.half+1,g.world.half-1);this.pos.z=clamp(this.pos.z,-g.world.half+1,g.world.half-1);this.pos.y=clamp(this.pos.y,.3,40);
  }else{
   this.yaw+=dt*.055;
   const a=this.age*.055,r=g.world.half*.7;this.pos.x=Math.sin(a)*r;this.pos.z=Math.cos(a)*r;
   if(this.id==='gunship'){if(inp.slot1)this.weapon=0;if(inp.slot2)this.weapon=1;if(inp.streak===0)this.weapon=2;}
   if(inp.fire&&this.cool<=0){const rounds=this.id==='gunship'?[[.1,1.7,32],[.9,5,105],[2.8,10,230]][this.weapon]:[.085,0,32];this.cool=rounds[0];this.fire(rounds[1],rounds[2]);}
   if(this.id==='chopper'&&inp.ads&&this.rockets>0&&this.rocketCool<=0){this.rocketCool=1;this.rockets--;this.fire(6,180);}
  }
  this.mesh.position.copy(this.pos);this.mesh.rotation.y=this.yaw;
  const cam=g.camera;cam.position.copy(this.pos).add(V(0,this.id==='wheelson'?.92:0,0));cam.rotation.set(this.pitch,this.yaw,0,'YXZ');cam.fov=this.air?58:76;cam.updateProjectionMatrix();g.audio.setListener(cam.position,this.yaw);
  g.grade.uniforms.nvg.value=0;g.grade.uniforms.thermal.value=this.air?.65:0;g.scopeState=null;
 }
 hud(){const controls=this.id==='gunship'?'1 / 2 / 3 切换口径 · 左键开火':this.id==='chopper'?`左键机炮 · 右键火箭（${this.rockets}）`:this.id==='cruise'?'鼠标制导 · 左键加速':this.id==='bombdrone'?'WASD 飞行 · 空格上升 / Ctrl 下降 · 左键引爆':'WASD 驾驶 · 左键射击';return `<div class="remote-visor"></div><div class="remote-cross">＋</div><div class="streak-readout">${this.name} / REMOTE LINK <b>${Math.ceil(this.time)}s · ${this.id==='gunship'?['25 mm','40 mm','105 mm'][this.weapon]:'HP '+Math.ceil(this.hp)}</b><small>${controls} · F 返回</small></div>`;}
 dispose(){super.dispose();if(this.sys.remote===this)this.sys.remote=null;this.game.camera.fov=this.fov||78;this.game.camera.updateProjectionMatrix();this.game.grade.uniforms.thermal.value=0;this.game.player?.ws&&(this.game.player.ws.cool=.35);}
}
