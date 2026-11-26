/* ============================================================
   BEAST KAISAR: LEGENDS 3D - Service Worker (PWA offline)
   ------------------------------------------------------------
   - Versi cache: bk-v4. GANTI VERSI INI (bk-v5, dst.) setiap kali
     file game diperbarui: browser otomatis menginstal SW baru,
     cache lama dihapus saat aktivasi, dan halaman menampilkan
     toast "Versi baru tersedia - ketuk untuk muat ulang".
   - Strategi: CACHE-FIRST (aset dianggap statis + terverifikasi).
   - Semua aset inti (game, ikon, library Three.js, font) di-
     precache saat INSTAL sehingga game jalan 100% offline.
   ============================================================ */

const CACHE_VERSI = 'bk-v4';

const DAFTAR_ASET = [
  // Halaman & manifest
  './',
  './index.html',
  './manifest.webmanifest',

  // Ikon PWA
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',

  // Font lokal (Russo One + Chakra Petch, subset latin)
  './fonts/fonts.css',
  './fonts/chakra-petch-400-latin.woff2',
  './fonts/chakra-petch-600-latin.woff2',
  './fonts/chakra-petch-700-latin.woff2',
  './fonts/russo-one-400-latin.woff2',

  // Library Three.js 0.160.0 lokal
  './lib/three.module.js',
  './lib/addons/postprocessing/EffectComposer.js',
  './lib/addons/postprocessing/RenderPass.js',
  './lib/addons/postprocessing/ShaderPass.js',
  './lib/addons/postprocessing/MaskPass.js',
  './lib/addons/postprocessing/Pass.js',
  './lib/addons/postprocessing/UnrealBloomPass.js',
  './lib/addons/postprocessing/OutputPass.js',
  './lib/addons/shaders/CopyShader.js',
  './lib/addons/shaders/LuminosityHighPassShader.js',
  './lib/addons/shaders/OutputShader.js'
];

/* ---------- INSTAL: simpan semua aset inti ke cache ----------
   Pakai allSettled supaya 1 file gagal tidak merusak instalasi;
   file yang gagal akan di-cache otomatis oleh fetch handler saat
   koneksi tersedia. */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSI).then((cache) =>
      Promise.allSettled(DAFTAR_ASET.map((aset) => cache.add(aset)))
    )
  );
});

/* ---------- AKTIVASI: hapus semua cache versi lama ----------
   Update otomatis: begitu SW bk-v4 aktif, cache bk-v3 dan
   sebelumnya langsung dibuang. */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((daftar) =>
        Promise.all(
          daftar
            .filter((nama) => nama !== CACHE_VERSI)
            .map((nama) => caches.delete(nama))
        )
      )
      .then(() => self.clients.claim())
  );
});

/* ---------- FETCH: strategi CACHE-FIRST ----------
   1. Ada di cache  -> langsung balas dari cache (offline tetap jalan).
   2. Tidak ada     -> ambil dari jaringan, lalu simpan salinannya.
   3. Jaringan gagal untuk navigasi -> fallback ke index.html. */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then((dariCache) => {
      if (dariCache) return dariCache;

      return fetch(req)
        .then((res) => {
          // simpan respons valid (same-origin 200 / opaque) ke cache
          if (res && (res.status === 200 || res.type === 'opaque')) {
            const salinan = res.clone();
            caches.open(CACHE_VERSI).then((cache) => cache.put(req, salinan));
          }
          return res;
        })
        .catch(() => {
          // offline & belum ter-cache: navigasi -> index.html tersimpan
          if (req.mode === 'navigate') {
            return caches.match('./index.html').then((h) => h || Response.error());
          }
          return Response.error();
        });
    })
  );
});

/* ---------- PESAN dari halaman ----------
   Toast pembaruan di halaman mengirim 'BK_LEWATI_TUNGGU' saat
   diketuk -> SW baru langsung aktif -> halaman memuat ulang. */
self.addEventListener('message', (event) => {
  if (event.data === 'BK_LEWATI_TUNGGU') {
    self.skipWaiting();
  }
});
