const CACHE="dorks-va-v3";
const ASSETS=["/","/guide.html","/dashboard.html","/styles.css","/guide.css","/dashboard.css","/script.js","/dashboard.js","/assets/logo.svg","/assets/favicon.svg","/assets/google-dorks-header-3.png","/assets/app-mockup.svg"];
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))));
self.addEventListener("fetch",event=>{if(event.request.method!=="GET"||new URL(event.request.url).pathname.startsWith("/api/"))return;event.respondWith(caches.match(event.request).then(response=>response||fetch(event.request)))});
