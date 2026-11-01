/* ดึง index.html ล่าสุดจาก Google Apps Script แล้วสร้างไฟล์แอปไว้ใน _site */
const fs=require('fs'),crypto=require('crypto'),{execFileSync}=require('child_process');const T=require('./transform.js');
const API=(fs.readFileSync('config.js','utf8').match(/https:\/\/script\.google\.com\/macros\/s\/[^'"]+\/exec/)||[])[0];
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
async function getRaw(u){
 try{const r=await fetch(u,{headers:{'User-Agent':UA,'Accept':'text/plain,*/*'}});console.log('fetch',r.status,new URL(r.url).host);if(r.ok)return await r.text()}catch(e){console.log('fetch error',e.message)}
 const out=execFileSync('curl',['-sSL','-A',UA,'-w','\n%{http_code}',u],{maxBuffer:50e6}).toString();const i=out.lastIndexOf('\n');console.log('curl',out.slice(i+1));
 if(out.slice(i+1)!=='200')throw new Error('ดึง index ไม่ได้ (curl '+out.slice(i+1)+')');return out.slice(0,i)}
(async()=>{if(!API)throw new Error('config.js ยังไม่มีลิงก์ /exec');
 const raw=await getRaw(API+'?raw=index');if(raw.length<100000||!raw.includes('<title>CC1 Study Lab</title>'))throw new Error('ได้ไฟล์ไม่ถูกต้อง ('+raw.length+')');
 const html=T(raw);const ver=crypto.createHash('sha1').update(html).digest('hex').slice(0,10);
 fs.mkdirSync('_site',{recursive:true});fs.writeFileSync('_site/index.html',html);
 fs.writeFileSync('_site/sw.js',fs.readFileSync('sw.js','utf8').replace(/cc1-[0-9a-f]{10}|cc1-__BUILD__/,'cc1-'+ver));
 for(const f of ['config.js','manifest.webmanifest','icon-192.png','icon-512.png','maskable-512.png','apple-touch-icon.png','favicon-32.png'])fs.copyFileSync(f,'_site/'+f);
 fs.writeFileSync('_site/.nojekyll','');console.log('built',ver,raw.length,'->',html.length)})().catch(e=>{console.error(e.message||e);process.exit(1)});
