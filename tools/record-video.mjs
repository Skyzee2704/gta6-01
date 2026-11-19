import {serve,launch,ready,errors} from './browser-drive.mjs';
import {spawnSync} from 'node:child_process';
import {mkdirSync,statSync} from 'node:fs';
let browser,server;
const deadline=setTimeout(()=>{console.error('FAIL video: bounded retry exceeded 9 minutes');process.exit(1);},540000);
try{
 server=await serve();browser=await launch();const page=await browser.newPage({viewport:{width:1280,height:720}}),err=errors(page);mkdirSync('/tmp/solmar-video-frames',{recursive:true});
 await ready(page,server.url+'?seed=1&quality=low');const cdp=await page.context().newCDPSession(page);
 for(let n=0;n<60;n++){
  if(n===10){await page.getByRole('button',{name:'New Game',exact:true}).click();await cdp.send('Input.dispatchKeyEvent',{type:'keyDown',key:'w',code:'KeyW',windowsVirtualKeyCode:87});}
  if(n===20){await cdp.send('Input.dispatchKeyEvent',{type:'keyUp',key:'w',code:'KeyW',windowsVirtualKeyCode:87});await page.evaluate(async()=>{const {spawnVehicle,enterVehicle}=await import('./src/vehicles.js');const {setWantedLevel}=await import('./src/police.js');const w=__solmar.world,p=w.player;enterVehicle(w,spawnVehicle(w,'sports',p.x,p.z,p.heading));setWantedLevel(w,4);});await cdp.send('Input.dispatchKeyEvent',{type:'keyDown',key:'w',code:'KeyW',windowsVirtualKeyCode:87});}
  if(n===40){await cdp.send('Input.dispatchKeyEvent',{type:'keyUp',key:'w',code:'KeyW',windowsVirtualKeyCode:87});await ready(page,server.url+'?shot=onfoot&seed=1&quality=low');}
  if(n===50)await ready(page,server.url+'?shot=map&seed=1&quality=low');
  await page.screenshot({path:`/tmp/solmar-video-frames/${String(n).padStart(3,'0')}.png`,timeout:30000});await page.waitForTimeout(500);if(n%10===0)console.log('Captured preview frame',n);
 }
 const out='/tmp/solmar-preview.mp4',r=spawnSync('ffmpeg',['-v','error','-y','-framerate','2','-i','/tmp/solmar-video-frames/%03d.png','-r','10','-c:v','libx264','-preset','ultrafast','-pix_fmt','yuv420p',out],{timeout:120000});if(r.status!==0)throw Error('encode: '+r.stderr);const duration=Number(spawnSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',out],{encoding:'utf8'}).stdout);if(duration<30||!statSync(out).size)throw Error('invalid video');if(err.length)throw Error(err.join('\n'));console.log('PASS video',out,'duration',duration);
}catch(e){console.error('FAIL video bounded retry:',e.stack);process.exitCode=1;}finally{clearTimeout(deadline);await browser?.close();server?.stop();}
