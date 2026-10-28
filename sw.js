// Minimaler Service Worker: lädt die App-Hülle auch bei kurzzeitig schlechtem Netz auf der Baustelle.
// Gespeicherte Daten selbst kommen weiterhin live von Supabase, sobald wieder Netz da ist.
var CACHE = 'tankprotokoll-shell-v1';
var SHELL = ['./index.html', './manifest.json', './icon.svg'];

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE).then(function(cache){ return cache.addAll(SHELL); })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(event){
  var req = event.request;
  if(req.method !== 'GET') return;
  var url = new URL(req.url);
  // Nur die App-Hülle selbst cachen, nie Supabase-API-Aufrufe
  if(url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then(function(cached){
      var network = fetch(req).then(function(res){
        if(res && res.ok){
          caches.open(CACHE).then(function(cache){ cache.put(req, res.clone()); });
        }
        return res;
      }).catch(function(){ return cached; });
      return cached || network;
    })
  );
});
