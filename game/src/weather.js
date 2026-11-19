import { registerSystem, pushEvent, addNotice } from './world.js';
// Available to main.js and simCheck; the existing car module need not import it.
export const gripFactor=w=>w.weather?.kind==='rain'?0.85:1;
export function stepWeather(w,input,dt){const v=w.weather ||= {kind:'clear',t:0,rain:0,lightning:0};
  if(!v.initialized){v.initialized=true;v.duration=60+w.rng()*60;v.flashT=15+w.rng()*15;v.noticeT=20;}
  v.t+=dt;while(v.t>=v.duration){v.t-=v.duration;v.kind={clear:'cloudy',cloudy:'rain',rain:'clear'}[v.kind]||'clear';v.duration=60+w.rng()*60;v.fromRain=v.rain;v.transitionT=0;pushEvent(w,'weather-change',{kind:v.kind});}
  v.transitionT=Math.min(10,(v.transitionT||0)+dt);const target=v.kind==='rain'?1:0;v.rain=(v.fromRain??0)+(target-(v.fromRain??0))*v.transitionT/10;
  v.lightning=Math.max(0,(v.lightning||0)-dt);v.noticeT+=dt;
  if(v.kind==='rain'){v.flashT-=dt;if(v.flashT<=0){v.flashT=15+w.rng()*15;v.lightning=0.2;pushEvent(w,'lightning');if(v.noticeT>=20){addNotice(w,'Lightning strikes in the distance.');v.noticeT=0;}}}
}
registerSystem('weather',stepWeather);
