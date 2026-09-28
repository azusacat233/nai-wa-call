// Bundled English male narration: no installed OS voice or network required.
let manifest={};
export async function loadRadio(){
 const response=await fetch('./assets/voice-manifest.json');if(!response.ok)throw new Error('Voice manifest missing');
 manifest=await response.json();
}
export class Radio{
 constructor(audio){this.audio=audio;this.queue=[];this.cache=new Map();this.epoch=0;this.busy=false;this.source=null;}
 duration(text){return manifest[text]?.duration||0;}
 say(text){
  const clip=manifest[text];if(!clip||!this.audio.voice||this.audio.volume===0)return;
  // Keep tactical callouts current during busy firefights.
  if(this.queue.some(c=>c.file===clip.file))return;
  this.queue.push(clip);if(this.queue.length>3)this.queue.shift();this.next();
 }
 async next(){
  if(this.busy||!this.queue.length)return;
  this.audio.init();if(!this.audio.ctx)return;
  const clip=this.queue.shift(),epoch=this.epoch;this.busy=true;
  try{
   if(!this.cache.has(clip.file))this.cache.set(clip.file,fetch(clip.file).then(r=>{if(!r.ok)throw new Error('Missing voice '+clip.file);return r.arrayBuffer();}).then(b=>this.audio.ctx.decodeAudioData(b)));
   const buffer=await this.cache.get(clip.file);
   if(epoch!==this.epoch)return;
   if(!this.audio.voice){this.busy=false;this.queue=[];return;}
   const source=this.audio.ctx.createBufferSource();source.buffer=buffer;source.playbackRate.value=.96;
   const gain=this.audio.ctx.createGain();gain.gain.value=.9;
   const filter=this.audio.ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=5200;
   source.connect(filter);filter.connect(gain);gain.connect(this.audio.master);this.source=source;
   source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();if(epoch===this.epoch){this.source=null;this.busy=false;this.next();}};
   source.start();
  }catch(e){if(epoch===this.epoch){this.busy=false;console.warn('Radio playback:',e.message);this.next();}}
 }
 stop(){this.epoch++;this.queue=[];this.busy=false;if(this.source){this.source.onended=null;try{this.source.stop();}catch{}this.source=null;}}
}
