export function homeMarkup(menu,art){
 const L=menu.level(),mode={tdm:'团队死斗',dom:'据点占领',ffa:'自由混战'}[menu.lobby.mode];
 const map='海岸前哨';
 return `
 <header class="ops-header">
  <div class="ops-brand"><strong>奶蛙召唤</strong><span>CALL OF NAIWA</span></div>
  <nav class="ops-nav" aria-label="大厅导航">
   <button class="active" data-a="home">开始游戏<small>PLAY</small></button>
   <button data-a="loadout">武器装备<small>WEAPONS</small></button>
   <button data-a="campaign">战役行动<small>CAMPAIGN</small></button>
   <button data-a="mp">自定义对战<small>MATCH SETUP</small></button>
   <button data-a="settings">设置<small>SETTINGS</small></button>
  </nav>
  <div class="ops-profile"><b>${String(L.lv).padStart(2,'0')}</b><div>指挥官<span>等级 ${L.lv} · ${L.xp.toLocaleString()} XP</span><i><em style="width:${Math.round(L.frac*100)}%"></em></i></div></div>
 </header>
 <div class="ops-status"><span><i></i> 本地战区 / LOCAL OPERATIONS</span><span>奶蛙特遣队 <b>03</b></span></div>
 <aside class="ops-playlist">
  <div class="ops-kicker">作战部署 <span>01 — 04</span></div>
  <button class="ops-feature" data-a="mp"><div class="ops-art">${art[menu.lobby.map]}</div><span class="ops-feature-tag">AI 战场</span><div class="ops-feature-title"><small>已选择模式</small><strong>${mode}</strong><span>${map} <i> / </i> ${menu.lobby.time} 分钟</span></div><span class="ops-arrow">↗</span></button>
  <button class="ops-deploy" data-a="deploy"><span>开始部署<small>DEPLOY NOW</small></span><b>›</b></button>
  <button class="ops-mini" data-a="campaign"><span class="ops-mini-icon">◈</span><span><b>前哨突袭</b><small>战役行动 · 三人小队</small></span><i>›</i></button>
  <button class="ops-mini" data-a="loadout"><span class="ops-mini-icon">⌖</span><span><b>检查装备</b><small>枪匠 · 配装 · 连杀奖励</small></span><i>›</i></button>
  <div class="ops-brief"><span>任务简报</span><p>保持队形。确认装备。<br>下一场行动，等你下令。</p></div>
 </aside>
 <div class="ops-leader"><span>◆ 指挥官</span><small>小队长 · 准备就绪</small></div>
 <aside class="ops-roster"><div class="ops-roster-head">作战小队 <span>3 / 3</span></div><div><i class="leader">◆</i><b>指挥官</b><span>玩家</span></div><div><i>◇</i><b>布雷克</b><span>AI 队友</span></div><div><i>◇</i><b>渡鸦</b><span>AI 队友</span></div><p>战役小队展示 · 对战人数可自定义</p></aside>
 <footer class="ops-footer"><div><span class="kbd">鼠标</span> 选择 <button data-a="fullscreen"><span class="kbd">F11</span> 全屏</button><button data-a="settings">⚙ 设置</button></div><span class="ops-offline"><i></i> 离线 AI 对战</span><button data-a="quit">退出游戏 <span>⏻</span></button></footer>`;
}
