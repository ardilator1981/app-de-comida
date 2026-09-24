/**
 * Service worker: deja la app disponible sin conexión.
 *
 * Los archivos propios se sirven desde caché y se refrescan en segundo
 * plano; las peticiones a otros dominios (miniaturas, oEmbed) van siempre
 * a la red y nunca se guardan.
 */
const VERSION = 'recetario-v2';
const ARCHIVOS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/app.js',
  './js/store.js',
  './js/ui.js',
  './js/parser.js',
  './js/units.js',
  './js/categories.js',
  './js/shopping.js',
  './js/dates.js',
  './js/backup.js',
  './js/emoji.js',
  './js/share.js',
  './js/views/recetario.js',
  './js/views/receta.js',
  './js/views/editor.js',
  './js/views/semana.js',
  './js/views/lista.js',
  './js/views/ajustes.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches
      .open(VERSION)
      // Si un archivo falla no queremos abortar toda la instalación.
      .then((cache) => Promise.allSettled(ARCHIVOS.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((c) => c !== VERSION).map((c) => caches.delete(c))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (evento) => {
  const peticion = evento.request;
  if (peticion.method !== 'GET') return;

  const url = new URL(peticion.url);
  if (url.origin !== self.location.origin) return; // miniaturas y oEmbed: directo a la red

  // Navegaciones (incluida la compartición): la app siempre debe abrir.
  if (peticion.mode === 'navigate') {
    evento.respondWith(
      fetch(peticion).catch(() => caches.match('./index.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  evento.respondWith(
    caches.match(peticion).then((guardado) => {
      const red = fetch(peticion)
        .then((respuesta) => {
          if (respuesta.ok) {
            const copia = respuesta.clone();
            caches.open(VERSION).then((cache) => cache.put(peticion, copia));
          }
          return respuesta;
        })
        .catch(() => guardado);
      return guardado || red;
    })
  );
});
