import {mkdirSync as ensureTestDir} from 'node:fs';
ensureTestDir('test-results',{recursive:true});
import {chromium} from 'playwright';import fs from 'node:fs';
const b=await chromium.connectOverCDP('http://127.0.0.1:9333'),p=b.contexts()[0].pages()[0],errors=[];
p.on('pageerror',e=>errors.push(e.message));const cdp=await p.context().newCDPSession(p);await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});await p.reload();await p.waitForFunction(()=>game.state==='menu',null,{timeout:60000});
const result=await p.evaluate(async()=>{
 const {VIDEO_STREAKS}=await import('./js/streak-data.js'),{StreakSystem}=await import('./js/streak-system.js'),THREE=await import('three');
 await game.startGame('mp',{mode:'tdm',map:'outpost',diff:0,allies:0,enemies:2,scoreLimit:1000,timeLimit:60});game.renderer.setAnimationLoop(null);game.godMode=true;game.audio.voice=false;
 const checks=[],ok=(name,v,detail)=>{checks.push({name,pass:!!v,detail});if(!v)throw new Error(name+': '+JSON.stringify(detail));};
 const mode=game.mode,pl=game.player;
 let safe;for(let i=0;i<100;i++){const q=game.world.randomWalkable();if(!game.world.lineBlocked(q.clone().add(new THREE.Vector3(0,60,0)),q.clone().add(new THREE.Vector3(0,1,0)))){safe=q;break;}}if(!safe)throw new Error('No open-air test point');
 const neutral={streak:-1,mdx:0,mdy:0};
 const reset=()=>{const factories=mode.streakSystem.factories;mode.streakSystem.dispose();mode.streakSystem=new StreakSystem(mode,factories);for(const a of mode.active)a.dispose?.();mode.active=[];pl.pos.copy(safe);pl.yaw=0;pl.hp=100;pl.alive=true;for(const bot of game.bots){bot.pos.copy(safe).add(new THREE.Vector3(1,0,0));bot.hp=10000;bot.alive=true;}return mode.streakSystem;};
 const steps=(sys,n,inp={})=>{for(let i=0;i<n;i++)sys.update(1/30,{...neutral,...inp});};
 ok('视频奖励条目与门槛',VIDEO_STREAKS.length===18&&VIDEO_STREAKS.map(s=>s.kills).join(',')==='4,4,5,5,6,6,6,7,7,8,8,8,10,10,10,12,12,15');
 ok('战场统一 HK416D',game.bots.every(b=>b.weaponId==='hk416'));
 for(const def of VIDEO_STREAKS){
  const sys=reset(),s={id:def.id,ready:true,used:false};mode.streakState=[s];
  const started=sys.activate(s);ok(def.id+' 启用',started,{units:sys.units.length,target:!!sys.target,remote:!!sys.remote});
  if(sys.target){
   ok(def.id+' 标记前不消耗',s.ready&&!s.used);
   sys.updateTarget({adsPressed:true});ok(def.id+' 取消保留奖励',s.ready&&!sys.target);
   sys.activate(s);game.camera.position.copy(safe).add(new THREE.Vector3(0,8,0));game.camera.lookAt(safe);
   for(let i=0;i<(def.id==='sae'?3:1);i++)sys.updateTarget({firePressed:true});
   ok(def.id+' 确认消耗',s.used&&!sys.target);
   steps(sys,480);ok(def.id+' 调度结束',sys.jobs.length===0);
   ok(def.id+' 实际伤害',game.bots.some(bot=>bot.hp<10000),game.bots.map(bot=>bot.hp));
  }else if(sys.remote){
   const remote=sys.remote,before=remote.pos.clone();steps(sys,4,{fwd:true,mdx:2});
   ok(def.id+' 遥控相机',game.camera.position.distanceTo(remote.pos)<1.1);
   if(def.id==='gunship'){sys.update(1/30,{...neutral,streak:0});ok('炮艇 105mm 切换',remote.weapon===2);sys.update(1/30,{...neutral,slot2:true});ok('炮艇 40mm 切换',remote.weapon===1);}
   if(def.id==='chopper'){sys.update(1/30,{...neutral,ads:true});ok('直升机火箭消耗',remote.rockets===5);}
   if(def.id==='bombdrone'){sys.update(1/30,{...neutral,firePressed:true});ok('无人机主动引爆',!remote.alive&&!sys.remote);}
   else{steps(sys,5,{fire:true});if(sys.remote)sys.update(1/30,{...neutral,interactPressed:true});ok(def.id+' 返回角色视角',!sys.remote);}
  }else if(['care','emergency','juggernaut'].includes(def.id)){
   ok(def.id+' 箱数',sys.units.length===(def.id==='emergency'?3:1));
   const box=sys.units[0];steps(sys,190);pl.pos.copy(box.pos);steps(sys,40,{interact:true});
   if(def.id==='juggernaut'){ok('机甲护甲和机枪',pl.juggernaut&&pl.maxHp===700&&pl.ws.w.id==='jugminigun');sys.restoreJug();ok('机甲卸载恢复 HK416D',!pl.juggernaut&&pl.ws.w.id==='hk416');}
   else ok(def.id+' 随机奖励领取',sys.bonus.length===1,sys.bonus);
  }else if(def.id==='clustermine'){
   ok('五枚子地雷',sys.units.length===5);const mine=sys.units[0];game.bots[0].pos.copy(mine.pos);steps(sys,80);ok('地雷接近引爆',!mine.alive&&game.bots[0].hp<10000);
  }else if(def.id==='uav'||def.id==='advanced'){
   ok(def.id+' 雷达启用',mode.uavActive(pl.team));if(def.id==='advanced')ok('尖端雷达朝向标记',sys.advanced[pl.team]>0);
   sys.units[0].takeDamage(10000,{explosive:true});ok(def.id+' 可摧毁',!mode.uavActive(pl.team));
  }else if(def.id==='heli'){steps(sys,240);ok('支援直升机实际攻击',game.bots.some(bot=>bot.hp<10000));}
  else if(def.id==='sentry'){ok('哨戒实体部署',mode.active.length===1);}
  sys.dispose();ok(def.id+' 清理状态',sys.units.length===0&&sys.jobs.length===0&&!sys.remote&&!document.getElementById('streak-control'));
 }
 const sys=reset();sys.award('uav');sys.update(1/30,{...neutral,bonusPressed:true});ok('按6使用空投奖励',sys.bonus.length===0&&mode.uavActive(pl.team));
 game.exitToMenu();game.godMode=false;game.audio.voice=true;game.renderer.setAnimationLoop(()=>game.frame());return checks;
});
fs.writeFileSync('test-results/naiwa-streak-tests.json',JSON.stringify({checks:result,errors},null,2));console.log(JSON.stringify({passed:result.filter(x=>x.pass).length,errors},null,2));await b.close();
