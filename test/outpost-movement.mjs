import {mkdirSync as ensureTestDir} from 'node:fs';
ensureTestDir('test-results',{recursive:true});
import {chromium} from 'playwright';import fs from 'node:fs';
const b=await chromium.connectOverCDP('http://127.0.0.1:9333'),p=b.contexts()[0].pages()[0],errors=[];p.on('pageerror',e=>errors.push(e.message));const c=await p.context().newCDPSession(p);await c.send('Network.setCacheDisabled',{cacheDisabled:true});await p.reload();await p.waitForFunction(()=>window.game?.state==='menu',null,{timeout:60000});
const results=await p.evaluate(async()=>{
 const checks=[],check=(name,pass,detail)=>{checks.push({name,pass:!!pass,detail});};const T=await import('three'),{MP_MAPS}=await import('./js/data.js'),{MAPS}=await import('./js/maps.js');check('唯一海岸前哨地图',MP_MAPS.length===1&&Object.keys(MAPS).join()==='outpost');
 await game.startGame('mp',{map:'outpost',mode:'tdm',diff:0,allies:5,enemies:6});game.renderer.setAnimationLoop(null);game.godMode=true;game.paused=false;game.menu.hide();document.getElementById('clickToPlay').classList.add('hidden');
 const w=game.world,pl=game.player,ws=pl.ws,idle={mdx:0,mdy:0,streak:-1};for(let i=0;i<90;i++)game.update(1/60,idle);
 const spawns=[...w.spawns.A,...w.spawns.B,...w.flagPos];check('出生点与据点均连通',spawns.every(s=>w.walkable(...w.cellOf(s.x,s.z))&&w.findPath(spawns[0],s)?.length>0),{nav:w.navPoints.length,colliders:w.boxes.length});
 let lane;for(const pos of w.navPoints){for(const yaw of [0,Math.PI/2,Math.PI,-Math.PI/2]){let free=true;for(let d=0;d<15;d+=.5){const x=pos.x-Math.sin(yaw)*d,z=pos.z-Math.cos(yaw)*d;if(!w.walkable(...w.cellOf(x,z))||w.groundHeight(x,z,0,.4)>.1||w.ceilingHeight(x,z,0,.4)<3){free=false;break;}}if(free){lane={pos,yaw};break;}}if(lane)break;}
 if(!lane)throw Error('No movement test lane');const reset=()=>{pl.pos.copy(lane.pos);pl.yaw=lane.yaw;pl.pitch=0;pl.vel.set(0,0,0);pl.crouching=false;pl.crouchT=0;pl.sliding=false;pl.onGround=true;pl.sprinting=false;pl.sprintLock=0;ws.state='idle';ws.adsT=0;ws.sprintT=0;};
 reset();for(let i=0;i<40;i++)pl.update(1/60,{...idle,fwd:true});const walk=Math.hypot(pl.vel.x,pl.vel.z);check('步行加速',walk>5.2,{walk,mobility:ws.w.stats.mobility});
 reset();for(let i=0;i<40;i++)pl.update(1/60,{...idle,fwd:true,sprint:true});const sprint=Math.hypot(pl.vel.x,pl.vel.z);check('冲刺加速',sprint>8,{sprint});
 pl.update(1/60,{...idle,fwd:true,sprint:true,crouchPressed:true,ads:true});const launch=Math.hypot(pl.vel.x,pl.vel.z),ammo=ws.w.mag;for(let i=0;i<30;i++)pl.update(1/60,{...idle,fwd:true,sprint:true,ads:true,fire:true});
 check('滑铲开镜及射击',pl.sliding&&ws.adsT===1&&ws.w.mag<ammo&&!pl.sprinting,{ads:ws.adsT,mag:ws.w.mag,launch,slideT:pl.slideT});
 check('滑铲开镜消除倾斜',Math.abs(game.camera.rotation.z)<.001&&Math.abs(ws.holder.rotation.z)<.001,{cameraRoll:game.camera.rotation.z,gunRoll:ws.holder.rotation.z});
 const before=Math.hypot(pl.vel.x,pl.vel.z),oldX=pl.vel.x;for(let i=0;i<6;i++)pl.update(1/60,{...idle,right:true,ads:true});check('滑铲转向不额外加速',Math.hypot(pl.vel.x,pl.vel.z)<=before&&Math.abs(pl.vel.x-oldX)>.05);
 pl.update(1/60,{...idle,jumpPressed:true,ads:true});check('滑铲直接接跳跃',!pl.sliding&&!pl.crouching&&pl.vel.y>5&&!pl.onGround,{vy:pl.vel.y});
 reset();for(let i=0;i<30;i++)pl.update(1/60,{...idle,fwd:true,sprint:true});for(let i=0;i<30;i++)pl.update(1/60,{...idle,fwd:true,sprint:true,ads:true});check('按住冲刺可直接右键开镜',ws.adsT===1&&!pl.sprinting);
 const optics=[];for(const optic of ['reddot','holo','acog','thermal','sniper']){ws.setLoadout([{id:'hk416',att:{optic},camo:'none'}]);ws.state='idle';ws.adsT=1;ws.rp=0;ws.vmRot=0;ws.vmKick=0;pl.vel.set(0,0,0);pl.sliding=true;pl.sprinting=false;ws.sprintT=0;pl.updateCamera(0);ws.updateViewmodel(0,idle);game.vmScene.updateMatrixWorld(true);game.vmCamera.updateMatrixWorld(true);const v=ws.w.info.reticle.getWorldPosition(new T.Vector3()).project(game.vmCamera);optics.push({optic,x:v.x,y:v.y,scope:game.scopeState});}
 check('五种瞄具中心对齐',optics.every(o=>Math.abs(o.x)<.005&&Math.abs(o.y)<.005),optics);
 ws.setLoadout([{id:'hk416',att:{optic:'holo'},camo:'none'}]);reset();ws.adsT=1;pl.pos.copy(w.navNearest(-17,-8));pl.yaw=-.6;pl.eyeSmooth=pl.pos.y+1.62;pl.updateCamera(1/60);ws.updateViewmodel(1/60,idle);game.hud.announceT=.001;game.hud.update(.02);game.paused=true;game.frame();
 check('光影材质启用',game.ao.enabled&&w.sun.castShadow&&w.def.id==='outpost'&&w.root.children.length>0,{shadowMap:w.sun.shadow.mapSize.x});
 return checks;
});await p.screenshot({path:'test-results/奶蛙召唤-海岸前哨瞄准镜.png'});console.log(JSON.stringify({results,errors},null,2));fs.writeFileSync('test-results/naiwa-outpost-movement-tests.json',JSON.stringify({results,errors},null,2));await b.close();if(results.some(r=>!r.pass)||errors.length)process.exitCode=1;
