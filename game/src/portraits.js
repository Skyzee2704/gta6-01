import { CAST, DISTRICTS } from './data.js';

const overrides = {milo:{hair:'short'},rosa:{hair:'bun'},kane:{hair:'slick'},juno:{hair:'bob'},mags:{hair:'gray',hairColor:'#a6a5a0'},benning:{hair:'cropped'}};
export const CAST_FEATURES = Object.fromEntries(CAST.map(c=>[c.id,{skin:c.skin,hair:c.hair,hairColor:c.hairColor,feature:c.feature,...overrides[c.id]}]));

export function drawPortrait(ctx, castId, x, y, size) {
  const cast=CAST.find(c=>c.id===castId)||CAST[0], f=CAST_FEATURES[cast.id];
  ctx.save();ctx.translate(x,y);ctx.scale(size/100,size/100);
  ctx.beginPath();ctx.rect(0,0,100,100);ctx.clip();
  const bg=ctx.createRadialGradient(48,40,2,50,50,72);
  bg.addColorStop(0,DISTRICTS[CAST.indexOf(cast)%DISTRICTS.length].accent);bg.addColorStop(1,'#10192b');ctx.fillStyle=bg;ctx.fillRect(0,0,100,100);
  const oval=(cx,cy,rx,ry,color)=>{ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);ctx.fill();};
  const line=(points,color,width=1)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();points.forEach(([a,b],i)=>i?ctx.lineTo(a,b):ctx.moveTo(a,b));ctx.stroke();};
  oval(50,108,40,31,cast.jacketColor);ctx.fillStyle=f.skin;ctx.fillRect(41,68,18,20);
  ctx.fillStyle='#f5ead2';ctx.beginPath();ctx.moveTo(34,81);ctx.lineTo(50,97);ctx.lineTo(66,81);ctx.lineTo(57,78);ctx.lineTo(50,88);ctx.lineTo(42,78);ctx.fill();
  if(f.hair==='bun')oval(72,23,13,14,f.hairColor);
  if(f.hair==='bob'){oval(50,44,30,35,f.hairColor);ctx.fillRect(22,40,56,35);}
  oval(28,49,5,9,f.skin);oval(72,49,5,9,f.skin);
  const skin=ctx.createLinearGradient(27,0,74,0);skin.addColorStop(0,'#80523f');skin.addColorStop(.4,f.skin);skin.addColorStop(.8,f.skin);skin.addColorStop(1,'#916044');
  oval(50,48,23,31,skin);
  oval(50,24,24,13,f.hairColor);
  ctx.fillStyle=f.hairColor;ctx.beginPath();ctx.moveTo(27,38);ctx.lineTo(28,22);ctx.quadraticCurveTo(48,8,72,23);ctx.lineTo(74,39);ctx.lineTo(67,28);ctx.quadraticCurveTo(48,32,32,27);ctx.closePath();ctx.fill();
  if(f.hair==='bob'){ctx.fillRect(23,26,8,45);ctx.fillRect(69,27,8,46);line([[32,25],[44,35],[60,28]],'#d94b92',4);}
  if(f.hair==='slick')for(let i=0;i<5;i++)line([[32+i*7,27],[38+i*6,17]],'#55504a',1);
  for(const ex of [40,60]){oval(ex,45,7,3.8,'#f9eee0');oval(ex+.5,45,2.9,3.4,cast.id==='juno'?'#497d79':'#64462b');oval(ex+.5,45,1.5,2.4,'#141720');oval(ex+1,44,0.8,.8,'#fff');line([[ex-7,38],[ex,36.5],[ex+6,38]],f.hairColor,2.5);}
  ctx.fillStyle='#9a644b';ctx.beginPath();ctx.moveTo(50,45);ctx.lineTo(45,59);ctx.quadraticCurveTo(50,63,55,59);ctx.closePath();ctx.fill();line([[50,46],[52,57]],'#e5b18a');
  oval(50,68,9,2.6,'#8a4b40');line([[42,67],[50,68],[58,67]],'#633c35');line([[45,72],[55,72]],'#d19873');
  if(cast.id==='kane'){for(let i=0;i<38;i++){const a=i*2.399;oval(50+Math.cos(a)*(12+i%6),66+Math.sin(a)*8,.55,.8,'#4a3b36');}line([[34,85],[39,95],[50,98],[62,94],[67,84]],'#d7bc6c',3);}
  if(cast.id==='rosa'){ctx.fillStyle='#bd343c';ctx.fillRect(27,27,47,7);ctx.beginPath();ctx.moveTo(72,30);ctx.lineTo(87,25);ctx.lineTo(83,40);ctx.fill();for(let i=0;i<6;i++)oval(31+i*7,30,1,1,'#f5ead2');}
  if(cast.id==='juno'){for(const ex of [39,61]){oval(ex,46,10,8,'#c6b26d');oval(ex,46,8,6,'rgba(30,51,60,.78)');line([[ex-5,43],[ex+3,48]],'#9eb8ba',1);}line([[48,44],[52,44]],'#d0bd7f',2);}
  if(cast.id==='mags'){oval(44,64,8,3,'#b9b4a8');oval(56,64,8,3,'#b9b4a8');ctx.fillStyle='#57594b';ctx.fillRect(29,12,42,15);oval(50,27,33,5,'#393d36');ctx.fillStyle='#b8a582';ctx.fillRect(30,22,40,4);}
  if(cast.id==='benning'){oval(50,21,29,13,'#24476e');ctx.fillStyle='#15283f';ctx.fillRect(23,26,54,6);oval(50,32,25,5,'#15283f');ctx.fillStyle='#ffc94d';ctx.fillRect(47,18,6,8);ctx.fillRect(65,87,6,8);}
  ctx.restore();
}
export function portraitCanvas(castId,size=72){if(typeof document==='undefined')throw new Error('portraitCanvas requires a browser document.');const c=document.createElement('canvas');c.width=c.height=Math.max(1,Math.round(size));drawPortrait(c.getContext('2d'),castId,0,0,c.width);return c;}
export function portraitDataURL(castId,size=72){return portraitCanvas(castId,size).toDataURL('image/png');}
