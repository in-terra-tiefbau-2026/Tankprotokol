// Minimaler Service Worker: lädt die App-Hülle auch bei kurzzeitig schlechtem Netz auf der Baustelle.
// Gespeicherte Daten selbst kommen weiterhin live von Supabase, sobald wieder Netz da ist.
// Strategie: Netzwerk zuerst (damit Code-Änderungen sofort ankommen), Cache nur als Rückfalloption bei schlechtem/keinem Netz.
var CACHE = 'tankprotokoll-shell-v2';
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
    fetch(req).then(function(res){
      if(res && res.ok){
        caches.open(CACHE).then(function(cache){ cache.put(req, res.clone()); });
      }
      return res;
    }).catch(function(){
      return caches.match(req);
    })
  );
});
