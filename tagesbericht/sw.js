// Service Worker für den Tagesbericht:
// 1. App-Hülle für schlechtes Netz auf der Baustelle (Netz zuerst, Zwischenspeicher nur als Rückfall).
// 2. Fotos, PDFs und Pläne (Adresse _blob/<id>) werden mit der Anmeldung aus dem privaten Speicher geholt.
var CACHE = 'tagesbericht-shell-v1';
var SHELL = ['./', './index.html', './manifest.json', './icon.svg'];

self.addEventListener('install', function(event){
  event.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(SHELL); }));
  self.skipWaiting();
});
self.addEventListener('activate', function(event){
  event.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){ return k !== CACHE && k !== 'tb-auth'; }).map(function(k){ return caches.delete(k); }));
  }));
  self.clients.claim();
});

function datei(id){
  return caches.open('tb-auth').then(function(c){ return c.match('./__token'); })
    .then(function(r){ return r ? r.json() : null; })
    .then(function(a){
      if(!a || !a.t) return new Response('Bitte zuerst anmelden.', { status: 401, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      return fetch(a.url + '/storage/v1/object/authenticated/dateien/' + id, { headers: { Authorization: 'Bearer ' + a.t, apikey: a.key } });
    });
}

self.addEventListener('fetch', function(event){
  var req = event.request;
  if(req.method !== 'GET') return;
  var url = new URL(req.url);
  if(url.origin !== self.location.origin) return;
  var m = url.pathname.match(/\/_blob\/([0-9a-f]{32})$/);
  if(m){ event.respondWith(datei(m[1])); return; }
  event.respondWith(
    fetch(req).then(function(res){
      if(res && res.ok){ var kopie = res.clone(); caches.open(CACHE).then(function(c){ c.put(req, kopie); }); }
      return res;
    }).catch(function(){ return caches.match(req); })
  );
});
