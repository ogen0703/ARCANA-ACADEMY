// 自分のファイルはネット優先(更新をすぐ反映)、つながらなければキャッシュ。データ(IndexedDB)には触らない
const CACHE = "arcana-v20";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", (e) => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url);
  const same = url.origin === location.origin, font = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!same && !font) return;
  // 絵(art/)は一度読んだら端末のキャッシュを使う(新しい版を出すとキャッシュ名が変わって取り直す)
  if (same && url.pathname.includes("/art/")) {
    e.respondWith(caches.open(CACHE).then((c) => c.match(req).then((hit) => hit || fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res; }))));
    return;
  }
  e.respondWith(fetch(req).then((res) => { const cp = res.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); return res; })
    .catch(() => caches.match(req).then((r) => r || (req.mode === "navigate" ? caches.match("./") : undefined))));
});
