'use strict';
const PREFIX='mes-missions-'+encodeURIComponent(self.registration.scope)+'-';
const CACHE=PREFIX+'v3-list-themes-art';
const ASSETS=['./','./index.html','./style.css','./themes.css','./core.js','./themes.js','./app.js','./manifest.webmanifest','./icon.svg',...['morning','horsebook','clean','garden','bows','minimal','kawaii','ponyrose','stables','country'].map(id=>'./art/'+id+'.webp')];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS.map(url=>new Request(url,{cache:'reload'})))).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put(event.request,copy)));}return response;}).catch(()=>caches.match(event.request,{cacheName:CACHE}).then(r=>r||(event.request.mode==='navigate'?caches.match('./index.html',{cacheName:CACHE}):Response.error()))));});
