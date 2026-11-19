import {serve,launch,ready} from './browser-drive.mjs';
export async function measureRender(){let browser,server;
try {server=await serve();browser=await launch();const page=await browser.newPage({viewport:{width:1280,height:720}});await ready(page,server.url+'?shot=cover&seed=1&quality=low');return await page.evaluate(()=>__solmar.renderer.stats());}finally{await browser?.close();server?.stop();}}
if(process.argv[1]?.endsWith('/measure-render.mjs'))console.log(JSON.stringify(await measureRender()));
