import { objectivePoint } from './minimap.js';
export function createRenderer2D(canvas,world){
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('SOLMAR 2D requires a canvas 2D context.');let visible=false,elapsed=0;
  const api={get visible(){return visible;},show(){visible=true;canvas.style.display='block';},hide(){visible=false;canvas.style.display='none';},resize(w,h){canvas.width=Math.max(1,w);canvas.height=Math.max(1,h);},update(w=world,dt=0){world=w;elapsed+=dt;if(!visible)return;const c=w.city,p=w.player,W=canvas.width,H=canvas.height,s=2.5;ctx.fillStyle='#0b1026';ctx.fillRect(0,0,W,H);if(!c)return;
    ctx.save();ctx.translate(W/2-p.x*s,H/2-p.z*s);ctx.scale(s,s);ctx.fillStyle='#507255';ctx.fillRect(p.x-W/s,p.z-H/s,W*2/s,H*2/s);
    const rect=(b,color)=>{ctx.fillStyle=color;ctx.fillRect(b.x0,b.z0,b.x1-b.x0,b.z1-b.z0);};
    rect({x0:-1000,x1:1000,z0:c.waterLineZ,z1:2000},'#246c92');rect(c.beach,'#d9c394');
    for(const b of c.blocks)rect(b,c.districts.find(d=>d.id===b.district)?.palette?.[0]||'#7e8975');
    for(const b of c.parks)rect(b,'#39774b');
    for(const r of c.roads){ctx.lineWidth=r.width||c.helpers?.roadWidth||12;ctx.strokeStyle='#333c44';ctx.setLineDash([]);ctx.beginPath();ctx.moveTo(r.x0,r.z0);ctx.lineTo(r.x1,r.z1);ctx.stroke();ctx.lineWidth=.5;ctx.strokeStyle='#d4bf85';ctx.setLineDash([4,5]);ctx.stroke();}ctx.setLineDash([]);
    for(const b of c.buildings){ctx.fillStyle='#28313b';ctx.fillRect(b.x-b.w/2,b.z-b.d/2,b.w,b.d);ctx.fillStyle=b.roofColor||'#777b7e';ctx.fillRect(b.x-b.w/2+1,b.z-b.d/2+1,Math.max(0,b.w-2),Math.max(0,b.d-2));}
    for(const v of w.vehicles){ctx.save();ctx.translate(v.x,v.z);ctx.rotate(v.heading||0);ctx.fillStyle=v.id===p.vehicleId?'#ffc94d':v.type==='cruiser'?'#4d8eda':'#8c979e';ctx.fillRect(-2.3,-1,4.6,2);ctx.fillStyle=v.type==='cruiser'?'#f1eee2':'#344b5c';ctx.fillRect(-.8,-.8,1.7,1.6);ctx.restore();}
    for(const n of [...w.npcs,...(w.cops||[])]){ctx.fillStyle=n.dead?'#593c3e':n.id?.startsWith('cop')?'#74a9ef':'#e5b896';ctx.beginPath();ctx.arc(n.x,n.z,.7,0,Math.PI*2);ctx.fill();}
    const target=objectivePoint(w);if(target){ctx.strokeStyle='#ffc94d';ctx.lineWidth=1;ctx.beginPath();ctx.arc(target.x,target.z,5+Math.sin(elapsed*4),0,Math.PI*2);ctx.stroke();}
    if(w.wanted&&w.searchZone){ctx.strokeStyle='rgba(255,70,70,.65)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(w.searchZone.x,w.searchZone.z,w.searchZone.radius,0,Math.PI*2);ctx.stroke();}
    ctx.translate(p.x,p.z);ctx.rotate(p.heading||0);ctx.fillStyle='#ffc94d';ctx.beginPath();ctx.moveTo(3,0);ctx.lineTo(-2,-1.8);ctx.lineTo(-1,0);ctx.lineTo(-2,1.8);ctx.closePath();ctx.fill();ctx.restore();ctx.font='16px system-ui, sans-serif';ctx.fillStyle='#f5ead2';ctx.fillText('SOLMAR 2D — top-down fallback (V to return to 3D)',16,28);
  }};return api;
}
