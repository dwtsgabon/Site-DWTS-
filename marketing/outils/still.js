const { chromium } = require('playwright'); const path=require('path');
(async()=>{const [html,out,...ts]=process.argv.slice(2);const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1920}});
await p.goto('file://'+path.resolve(html));await p.evaluate(()=>document.fonts.ready);await p.evaluate(()=>document.getAnimations().forEach(a=>a.pause()));
for(const t of ts){await p.evaluate(t=>document.getAnimations().forEach(a=>a.currentTime=t),+t*1000);await p.screenshot({path:`${out}-${t}.png`});}
await b.close();})();
