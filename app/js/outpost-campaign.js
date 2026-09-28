import * as THREE from 'three';
import {Player} from './player.js';
import {Bot} from './ai.js';
import {fmtTime} from './util.js';

export class Campaign {
  constructor(game,cfg){this.game=game;this.cfg=cfg;this.diff=cfg.diff??1;this.canChangeClass=false;this.nvgAvailable=true;this.step=0;this.hold=0;this.done=false;this.deaths=0;}
  start(){
    const g=this.game,w=g.world;g.playerSleeve='fab_ally';g.botDmgMul=[.7,1,1.25][this.diff];
    const p=g.player=new Player(g,{team:'A',pos:w.spawns.A[0],yaw:Math.PI,name:'你'});
    p.dmgMul=[.45,.8,1.3][this.diff];p.equip({primary:{id:'hk416',att:{optic:'holo',muzzle:'suppressor',under:'vgrip'}},secondary:{id:'m1911',att:{}},lethal:'frag',tactical:'flash',perks:['sleight']});g.entities.push(p);
    this.checkpoint=w.spawns.A[0].clone();
    this.allies=['布雷克上尉','渡鸦'].map((name,i)=>g.addBot(new Bot(g,{team:'A',name,style:'ally',weaponId:'hk416',att:{optic:'holo'},difficulty:2,pos:w.spawns.A[i+1],role:'ally',tag:true,hp:100000,grenades:0})));
    this.spawnWave(6,w.flagPos[1]);
    const terminal=new THREE.Mesh(new THREE.BoxGeometry(.7,1.1,.4),new THREE.MeshStandardMaterial({color:0x333f3b,metalness:.5,roughness:.4}));terminal.position.copy(w.laptopPos).add(new THREE.Vector3(0,.55,0));w.root.add(terminal);
    const screen=new THREE.Mesh(new THREE.PlaneGeometry(.48,.3),new THREE.MeshStandardMaterial({color:0x43d4cb,emissive:0x43d4cb,emissiveIntensity:1.5}));screen.position.set(0,.25,.205);terminal.add(screen);
    g.hud.reset();g.hud.announce('前哨突袭','清除守军 · 下载情报 · 抵御增援 · 撤离',5);g.audio.say('团队死斗，行动开始');
  }
  spawnWave(count,target){
    const g=this.game,w=g.world;this.wave=[];
    for(let i=0;i<count;i++){
      const seed=w.spawns.B[i%w.spawns.B.length],pos=w.navNearest(seed.x+(i%2)*2,seed.z-i*.6);
      this.wave.push(g.addBot(new Bot(g,{team:'B',name:'前哨守军',style:'enemy',weaponId:'hk416',att:{optic:'reddot'},difficulty:this.diff,pos,role:'assault',assaultTarget:target.clone(),alerted:true,grenades:this.diff>0?1:0})));
    }
  }
  alertGroup(){}
  update(dt,inp){
    const g=this.game,p=g.player,h=g.hud,w=g.world;if(this.done)return;
    if(!p.alive){this.deadT-=dt;document.getElementById('respawnText').textContent=this.deadT>0?'正在读取检查点…':'按 [空格] 从检查点继续';if(this.deadT<=0&&inp.jumpPressed)this.respawn();return;}
    this.interactPrompt=false;let target;
    if(this.step===0){h.objective('前哨突袭','清除基地守军',`剩余 ${this.wave.filter(b=>b.alive).length} 人`);target=this.wave.find(b=>b.alive)?.pos;if(!target){this.step=1;this.checkpoint.copy(w.flagPos[1]);p.ws.fullAmmo();}}
    if(this.step===1){
      target=w.laptopPos;h.objective('前哨突袭','前往通讯终端，按住 F 下载情报');const near=p.pos.distanceTo(target)<2.3;
      if(near){this.interactPrompt=true;h.prompt('<b>F</b> 按住下载情报');}
      this.hold=near&&inp.interact?this.hold+dt:0;h.progress(this.hold>0?this.hold/3:null,'下载情报');
      if(this.hold>=3){this.step=2;this.defendT=45;this.hold=0;h.progress(null);this.spawnWave(8,w.laptopPos);p.ws.fullAmmo();this.checkpoint.copy(w.laptopPos);}
    }
    if(this.step===2){this.defendT-=dt;target=w.laptopPos;h.objective('前哨突袭','抵御增援，等待撤离',`${Math.ceil(Math.max(0,this.defendT))} 秒 · 剩余敌人 ${this.wave.filter(b=>b.alive).length}`);if(this.defendT<=0&&!this.wave.some(b=>b.alive)){this.step=3;this.checkpoint.copy(w.flagPos[1]);}}
    if(this.step===3){target=w.lzPos;h.objective('前哨突袭','返回入口撤离');if(p.pos.distanceTo(target)<2.5){this.interactPrompt=true;h.prompt('<b>F</b> 撤离');if(inp.interactPressed)this.complete();}}
    if(!this.interactPrompt&&!g.nearPickup)h.prompt(null);
    h.setMarkers(target?[{id:'outpost-task',pos:target.clone().add(new THREE.Vector3(0,2,0)),label:'▼',text:this.step===3?'撤离':this.step===1?'情报':'目标'}]:[]);
  }
  respawn(){const g=this.game;g.player.respawn(this.checkpoint,Math.PI);g.dead=false;document.getElementById('deathScreen').classList.add('hidden');g.lock();}
  onKill(killer,victim,weapon,head){
    const g=this.game,p=g.player;
    if(victim.isPlayer){g.dead=true;g.deathKiller=killer;this.deaths++;this.deadT=2;document.getElementById('deathScreen').classList.remove('hidden');document.getElementById('killerInfo').textContent='你在前哨行动中阵亡';document.querySelector('#deathScreen .death-btns').style.display='none';if(document.pointerLockElement)document.exitPointerLock();return;}
    if(killer?.isPlayer){p.stats.kills++;if(head)p.stats.headshots++;g.hud.popup(head?'爆头':'击杀','#fff');}
    if(victim.team==='B')g.spawnPickup(victim.weaponId,victim.att,victim.pos,15,30);g.hud.killfeed(killer,victim,weapon,head);
  }
  complete(){
    if(this.done)return;this.done=true;const g=this.game,p=g.player;g.ending=true;g.profile.xp+=1500+p.stats.kills*50;g.saveProfile();
    if(document.pointerLockElement)document.exitPointerLock();
    g.menu.showResults({win:'win',title:'任务完成',sub:'前哨突袭',stats:[['用时',fmtTime(g.time)],['击杀',p.stats.kills],['阵亡',this.deaths]],board:'',again:()=>g.startGame('campaign',this.cfg)});
  }
  scoreboardHTML(){return `<table class="sbt A"><tr><th>前哨突袭</th><th>${fmtTime(this.game.time)}</th></tr><tr><td>击杀</td><td>${this.game.player.stats.kills}</td></tr></table>`;}
  minimapMarkers(){const w=this.game.world,p=this.step===3?w.lzPos:w.laptopPos;return[{x:p.x,z:p.z,color:'#ffb400'}];}
  dispose(){this.game.hud.progress(null);document.querySelector('#deathScreen .death-btns').style.display='';}
}
