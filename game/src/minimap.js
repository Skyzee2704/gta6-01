const FONT='system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
function bounds(city){const ds=city?.districts||[];return {x0:Math.min(-320,...ds.map(d=>d.x0)),x1:Math.max(320,...ds.map(d=>d.x1)),z0:Math.min(-260,...ds.map(d=>d.z0)),z1:Math.max(280,...ds.map(d=>d.z1))};}
export function worldToMap(city,x,z,w,h){const b=bounds(city);return {mx:(x-b.x0)/(b.x1-b.x0)*w,my:(z-b.z0)/(b.z1-b.z0)*h};}
export function objectivePoint(world){const a=world?.mission?.active,s=a?.stage||a?.stages?.[a.stageIndex];if(!s)return null;const v=world.vehicles?.find(v=>v.id===s.vehicleId);const item=world.pickups?.find(p=>s.targets?.includes(p.id)&&!p.taken&&!p.collected);return v||item||s.position;}
const COLORS={mission:'#ffc94d',police:'#579bff',postcard:'#ff77b8',diner:'#f49946',gunstore:'#ec6060',respray:'#b88aff',safehouse:'#72d58a',penthouse:'#72d58a',helipad:'#e7ede9',pier:'#7bd0d3',race:'#ffffff',car:'#a8b3b8'};
function paint(ctx,city,world,w,h,view,full){
  ctx.save();ctx.beginPath();ctx.rect(0,0,w,h);ctx.clip();ctx.fillStyle='#304d42';ctx.fillRect(0,0,w,h);if(!city){ctx.restore();return;}
  const sx=w/(view.x1-view.x0),sz=h/(view.z1-view.z0),p=(x,z)=>({x:(x-view.x0)*sx,y:(z-view.z0)*sz});
  const rect=(b,color)=>{const a=p(b.x0,b.z0);ctx.fillStyle=color;ctx.fillRect(a.x,a.y,(b.x1-b.x0)*sx,(b.z1-b.z0)*sz);};
  rect({x0:view.x0,x1:view.x1,z0:city.waterLineZ,z1:Math.max(view.z1,city.waterLineZ)},'#245d83');if(city.beach)rect(city.beach,'#d6c18c');
  for(const b of city.blocks||[]){const d=city.districts.find(d=>d.id===b.district);rect(b,d?.palette?.[0]||'#9aab9e');ctx.globalAlpha=.22;rect(b,d?.accent||'#2ee6c8');ctx.globalAlpha=1;}
  for(const park of city.parks||[])rect(park,'#548963');
  for(const r of city.roads||[]){const a=p(r.x0,r.z0),b=p(r.x1,r.z1);ctx.strokeStyle='#657176';ctx.lineWidth=Math.max(1,(r.width||city.helpers?.roadWidth||12)*(sx+sz)/2);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
  function mark(item,kind,r=3){if(!item||!Number.isFinite(item.x)||!Number.isFinite(item.z))return;const a=p(item.x,item.z);if(a.x<-12||a.x>w+12||a.y<-12||a.y>h+12)return;ctx.fillStyle=COLORS[kind]||'#fff';ctx.strokeStyle='#10202b';ctx.lineWidth=1;
    ctx.beginPath();if(kind==='mission'){for(let i=0;i<10;i++){const angle=i*Math.PI/5-Math.PI/2,rad=i%2?r/2:r;i?ctx.lineTo(a.x+Math.cos(angle)*rad,a.y+Math.sin(angle)*rad):ctx.moveTo(a.x+Math.cos(angle)*rad,a.y+Math.sin(angle)*rad);}ctx.closePath();}else ctx.arc(a.x,a.y,r,0,Math.PI*2);ctx.fill();ctx.stroke();
    if(['helipad','pier','safehouse','penthouse','race'].includes(kind)){ctx.font=`bold ${Math.max(9,r*1.5)}px ${FONT}`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#10202b';ctx.fillText(({helipad:'H',pier:'T',safehouse:'⌂',penthouse:'⌂',race:'+'})[kind],a.x,a.y);if(kind==='race'){ctx.fillRect(a.x-r/2,a.y-r/2,r/2,r/2);ctx.fillRect(a.x,a.y,r/2,r/2);}}}
  if(world?.searchZone){const q=world.searchZone,a=p(q.x,q.z);ctx.strokeStyle=`rgba(255,85,85,${world.wanted? .45+.3*Math.sin((world.elapsed||0)*5):.4})`;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(a.x,a.y,q.radius*sx,q.radius*sz,0,0,Math.PI*2);ctx.stroke();}
  for(const l of city.landmarks||[])if(COLORS[l.kind])mark(l,l.kind,full?5:4);
  for(const route of city.raceRoutes||[])mark(route.checkpoints?.[0],'race',5);
  for(const c of world?.pickups||city.postcards||[])if((c.kind==='postcard'||!c.kind)&&!c.collected&&!c.taken)mark(c,'postcard',2.5);
  for(const v of world?.vehicles||[])if(v.id!==world.player?.vehicleId)mark(v,v.type==='cruiser'?'police':'car',2);
  for(const c of world?.cops||[])mark(c,'police',3);
  mark(objectivePoint(world),'mission',full?9:7);
  if(full){for(const d of city.districts){const a=p((d.x0+d.x1)/2,(d.z0+d.z1)/2);ctx.font=`13px ${FONT}`;ctx.textAlign='center';ctx.textBaseline='middle';const width=ctx.measureText(d.name).width+16;ctx.fillStyle='rgba(10,14,30,.92)';ctx.beginPath();ctx.roundRect(a.x-width/2,a.y-12,width,24,12);ctx.fill();ctx.fillStyle=d.accent||d.color;ctx.fillText(d.name,a.x,a.y);}
    ctx.font=`13px ${FONT}`;ctx.fillStyle='#f5ead2';for(let i=0;i<6;i++){ctx.fillText(String.fromCharCode(65+i),(i+.5)*w/6,10);ctx.fillText(String.fromCharCode(65+i),(i+.5)*w/6,h-9);ctx.fillText(String(i+1),9,(i+.5)*h/6);ctx.fillText(String(i+1),w-9,(i+.5)*h/6);}}
  if(world?.player){const a=p(world.player.x,world.player.z);ctx.save();ctx.translate(a.x,a.y);ctx.rotate(world.player.heading||0);ctx.fillStyle='#fff';ctx.strokeStyle='#18232b';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(9,0);ctx.lineTo(-6,-5);ctx.lineTo(-3,0);ctx.lineTo(-6,5);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();}
  ctx.restore();
}
export function drawCityMap(ctx,city,world,w,h){paint(ctx,city,world,w,h,bounds(city),true);}
export function drawMinimap(ctx,city,world,w,h){const p=world?.player||{x:0,z:0},halfZ=120*h/w;paint(ctx,city,world,w,h,{x0:p.x-120,x1:p.x+120,z0:p.z-halfZ,z1:p.z+halfZ},false);}
