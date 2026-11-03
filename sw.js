// Goa '27 service worker: always load the newest page when online, use the saved copy offline.
var CACHE = "goa27-v1";

self.addEventListener("install", function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(["./","manifest.webmanifest","icon-192.png","apple-touch-icon.png"]); }));
});

self.addEventListener("activate", function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});

self.addEventListener("fetch", function(e){
  var r = e.request, u = new URL(r.url);
  if(r.method !== "GET") return;
  if(u.origin === location.origin){
    // network first, skipping the 10-minute HTTP cache, so every launch gets the latest version
    e.respondWith(fetch(r.url,{cache:"no-cache",credentials:"same-origin"}).then(function(res){
      if(res.ok){ var cp = res.clone(); caches.open(CACHE).then(function(c){ c.put(u.pathname.endsWith("/") ? "./" : r, cp); }); }
      return res;
    }).catch(function(){
      return caches.match(r,{ignoreSearch:true}).then(function(m){ return m || caches.match("./"); });
    }));
  } else if(u.hostname === "www.gstatic.com" || /^fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)){
    // versioned libraries and fonts: saved copy first, refreshed in the background
    e.respondWith(caches.open(CACHE).then(function(c){
      return c.match(r).then(function(m){
        var net = fetch(r).then(function(res){ if(res.ok || res.type === "opaque") c.put(r,res.clone()); return res; });
        if(m){ net.catch(function(){}); return m; }
        return net;
      });
    }));
  }
});
