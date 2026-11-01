/* ดึง index.html ล่าสุดจาก Google Apps Script แล้วสร้างไฟล์แอปไว้ใน _site */
const fs=require('fs'),crypto=require('crypto');const T=require('./transform.js');
const API=(fs.readFileSync('config.js','utf8').match(/https:\/\/script\.google\.com\/macros\/s\/[^'"]+\/exec/)||[])[0];
(async()=>{if(!API)throw new Error('config.js ยังไม่มีลิงก์ /exec');
 const r=await fetch(API+'?raw=index');if(!r.ok)throw new Error('ดึง index ไม่ได้: '+r.status);
 const raw=await r.text();if(raw.length<100000||!raw.includes('<title>CC1 Study Lab</title>'))throw new Error('ได้ไฟล์ไม่ถูกต้อง ('+raw.length+')');
 const html=T(raw);const ver=crypto.createHash('sha1').update(html).digest('hex').slice(0,10);
 fs.mkdirSync('_site',{recursive:true});fs.writeFileSync('_site/index.html',html);
 fs.writeFileSync('_site/sw.js',fs.readFileSync('sw.js','utf8').replace(/cc1-[0-9a-f]{10}|cc1-__BUILD__/,'cc1-'+ver));
 for(const f of ['config.js','manifest.webmanifest','icon-192.png','icon-512.png','maskable-512.png','apple-touch-icon.png','favicon-32.png'])fs.copyFileSync(f,'_site/'+f);
 fs.writeFileSync('_site/.nojekyll','');console.log('built',ver,raw.length,'->',html.length)})().catch(e=>{console.error(e.message||e);process.exit(1)});
