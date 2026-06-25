// KIO-1.3 — bump CACHE version to force PWA update
const CACHE='kio-v14';
const ASSETS=['/','/index.html','/manifest.json'];
const OFFLINE_URL='/index.html';

self.addEventListener('install',e=>{
  e.waitUntil(
    caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',e=>{
  // Never intercept Firestore, Firebase, Storage, or Nominatim requests
  const url=e.request.url;
  if(url.includes('firestore')||url.includes('firebase')||
     url.includes('googleapis')||url.includes('nominatim')||
     url.includes('gstatic')||url.includes('unpkg')||
     e.request.method!=='GET'){
    return;
  }
  // Network-first for HTML so PWA always gets latest app code
  if(url.includes('index.html')||e.request.mode==='navigate'){
    e.respondWith(
      fetch(e.request)
        .then(res=>{
          if(res&&res.status===200){
            const clone=res.clone();
            caches.open(CACHE).then(c=>c.put(e.request,clone));
          }
          return res;
        })
        .catch(()=>caches.match(OFFLINE_URL))
    );
    return;
  }
  // Cache-first for everything else
  e.respondWith(
    caches.match(e.request).then(cached=>{
      if(cached)return cached;
      return fetch(e.request).then(res=>{
        if(res&&res.status===200&&res.type==='basic'){
          const clone=res.clone();
          caches.open(CACHE).then(c=>c.put(e.request,clone));
        }
        return res;
      }).catch(()=>caches.match(OFFLINE_URL));
    })
  );
});

// Allow the page to trigger skipWaiting so new SW activates immediately
self.addEventListener('message',e=>{
  if(e.data&&e.data.type==='SKIP_WAITING')self.skipWaiting();
});
