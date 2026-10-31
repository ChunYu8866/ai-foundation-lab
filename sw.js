const CACHE = 'zhixu-ai-v6';
const FILES = ['./','./index.html','./src/app.js','./src/store.js','./src/content.js','./src/styles.css','./src/sources.json','./src/exam.css','./src/practice.js','./src/exam-engine.js','./src/question-bank.js','./src/bank-summary.js','./src/exam-foundations.js','./src/exam-models.js','./src/exam-applications.js','./src/exam-materials-s1.js','./src/exam-materials-s2.js','./public/icons/icon.svg','./public/icons/apple-touch-icon.png','./public/icons/icon-192.png','./public/manifest.webmanifest'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('zhixu-ai-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch', event => {
  if(event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}return response;}).catch(()=>caches.match(event.request).then(cached=>cached || (event.request.mode === 'navigate' ? caches.match('./index.html') : Response.error()))));
});
