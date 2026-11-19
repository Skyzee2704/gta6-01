export function createInput(){const i={};for(const k of ['forward','back','left','right','run','jump','enter','shoot','reload','interact','handbrake','horn','weaponNext','weaponPrev','pause','map','view2d','crouch','weaponWheel'])i[k]=false;return {...i,mouseDX:0,mouseDY:0,mouseX:0,mouseY:0,pressed:{},keys:{}};}
const bindings={KeyW:['forward'],ArrowUp:['forward'],KeyS:['back'],ArrowDown:['back'],KeyA:['left'],ArrowLeft:['left'],KeyD:['right'],ArrowRight:['right'],ShiftLeft:['run'],ShiftRight:['run'],Space:['jump','handbrake'],KeyE:['enter','interact'],KeyF:['shoot'],KeyR:['reload'],KeyQ:['weaponWheel'],KeyM:['map'],KeyV:['view2d'],Escape:['pause'],KeyC:['crouch'],KeyH:['horn'],BracketRight:['weaponNext'],BracketLeft:['weaponPrev']};
export function initInput(i,canvas){if(typeof window==='undefined'||!canvas?.addEventListener)return ()=>{};const listeners=[];const on=(target,type,fn)=>{target.addEventListener(type,fn);listeners.push(()=>target.removeEventListener(type,fn));};
  const refresh=()=>{for(const actions of Object.values(bindings))for(const action of actions)i[action]=Object.entries(bindings).some(([code,list])=>list.includes(action)&&i.keys[code]);i.shoot=!!(i.keys.Mouse0||i.keys.KeyF);};
  on(window,'keydown',e=>{const actions=bindings[e.code];if(!actions)return;if(e.code==='Space'||e.code.startsWith('Arrow'))e.preventDefault();const edge=!i.keys[e.code]&&!e.repeat;i.keys[e.code]=true;refresh();if(edge)for(const action of actions)i.pressed[action]=true;});
  on(window,'keyup',e=>{i.keys[e.code]=false;refresh();});
  on(canvas,'mousedown',e=>{if(e.button!==0)return;if(!i.keys.Mouse0)i.pressed.shoot=true;i.keys.Mouse0=true;refresh();});
  on(window,'mouseup',e=>{if(e.button===0){i.keys.Mouse0=false;refresh();}});
  on(canvas,'mousemove',e=>{i.mouseDX+=e.movementX||0;i.mouseDY+=e.movementY||0;const r=canvas.getBoundingClientRect();i.mouseX=(e.clientX-r.left)*(canvas.width||r.width)/Math.max(1,r.width);i.mouseY=(e.clientY-r.top)*(canvas.height||r.height)/Math.max(1,r.height);});
  on(window,'blur',()=>{i.keys={};refresh();clearPressed(i);});return ()=>{for(const remove of listeners)remove();i.keys={};refresh();clearPressed(i);};
}
export function clearPressed(i){i.pressed={};i.mouseDX=0;i.mouseDY=0;}
