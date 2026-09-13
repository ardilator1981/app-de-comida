/**
 * Armazón de la aplicación: rutas, cabecera y navegación.
 *
 * La navegación va por el hash (#/semana) para que funcione como página
 * estática en cualquier hosting y dentro de la app instalada.
 */
import { recogerCompartido } from './share.js';
import { generarLista } from './shopping.js';
import { cargar, obtener, suscribir } from './store.js';
import { el, icono, pintar } from './ui.js';

import * as vistaRecetario from './views/recetario.js';
import * as vistaReceta from './views/receta.js';
import * as vistaEditor from './views/editor.js';
import * as vistaSemana from './views/semana.js';
import * as vistaLista from './views/lista.js';
import * as vistaAjustes from './views/ajustes.js';

const RUTAS = [
  { patron: /^#?\/?$/, vista: vistaRecetario, pestana: 'recetario' },
  { patron: /^#\/recetario$/, vista: vistaRecetario, pestana: 'recetario' },
  { patron: /^#\/receta\/(?<id>[^/]+)$/, vista: vistaReceta, pestana: 'recetario' },
  { patron: /^#\/nueva$/, vista: vistaEditor, pestana: 'recetario' },
  { patron: /^#\/editar\/(?<id>[^/]+)$/, vista: vistaEditor, pestana: 'recetario' },
  { patron: /^#\/semana$/, vista: vistaSemana, pestana: 'semana' },
  { patron: /^#\/lista$/, vista: vistaLista, pestana: 'lista' },
  { patron: /^#\/ajustes$/, vista: vistaAjustes, pestana: 'ajustes' },
];

const PESTANAS = [
  { id: 'recetario', ruta: '#/recetario', etiqueta: 'Recetario', icono: 'libro' },
  { id: 'semana', ruta: '#/semana', etiqueta: 'Semana', icono: 'calendario' },
  { id: 'lista', ruta: '#/lista', etiqueta: 'Lista', icono: 'carrito' },
  { id: 'ajustes', ruta: '#/ajustes', etiqueta: 'Ajustes', icono: 'ajustes' },
];

const nodos = {
  cabecera: document.getElementById('cabecera'),
  contenido: document.getElementById('contenido'),
  nav: document.getElementById('nav'),
};

let fabActual = null;

export function ir(ruta) {
  if (location.hash === ruta) dibujar();
  else location.hash = ruta;
}

function resolver() {
  const hash = location.hash || '#/recetario';
  for (const ruta of RUTAS) {
    const m = hash.match(ruta.patron);
    if (m) return { ...ruta, params: m.groups || {} };
  }
  return { ...RUTAS[1], params: {} };
}

/** Cuántos artículos quedan por comprar (globo de la pestaña "Lista"). */
function pendientesDeCompra() {
  const estado = obtener();
  const { desde, hasta } = vistaLista.rangoActivo();
  const comidas = estado.semana.filter((c) => !desde || (c.fecha >= desde && c.fecha <= hasta));
  if (!comidas.length && !estado.lista.extras.length) return 0;
  const datos = generarLista({
    recetas: estado.recetas,
    comidas,
    extras: estado.lista.extras,
    hechos: estado.lista.hechos,
  });
  return datos.total - datos.hechos;
}

function dibujarNav(activa) {
  const pendientes = pendientesDeCompra();
  pintar(
    nodos.nav,
    PESTANAS.map((p) =>
      el(
        'button',
        {
          class: 'nav-boton',
          type: 'button',
          'aria-current': p.id === activa ? 'page' : null,
          onclick: () => ir(p.ruta),
        },
        [
          icono(p.icono, 22),
          p.etiqueta,
          p.id === 'lista' && pendientes > 0
            ? el('span', { class: 'globo', text: pendientes > 99 ? '99+' : String(pendientes) })
            : null,
        ]
      )
    )
  );
}

function dibujar() {
  const ruta = resolver();
  const ctx = { params: ruta.params, ir, redibujar: dibujar };
  const resultado = ruta.vista.vista(ctx);

  // Cabecera: botón de volver opcional, título y acciones de la vista.
  pintar(
    nodos.cabecera,
    [
      resultado.atras
        ? el('button', { class: 'boton-icono', type: 'button', 'aria-label': 'Volver', onclick: () => ir(resultado.atras) }, [
            icono('atras', 22),
          ])
        : null,
      el('h1', { class: resultado.atras ? 'titulo-truncado' : '', text: resultado.titulo }),
      ...(resultado.acciones || []),
    ].filter(Boolean)
  );

  pintar(nodos.contenido, resultado.contenido);

  fabActual?.remove();
  fabActual = resultado.fab || null;
  if (fabActual) document.body.append(fabActual);

  dibujarNav(ruta.pestana);
  document.title = resultado.titulo === 'Recetario' ? 'Recetario' : `${resultado.titulo} · Recetario`;
  window.scrollTo(0, 0);
}

function arrancar() {
  cargar();

  window.addEventListener('hashchange', dibujar);
  // Los cambios de datos solo refrescan el globo: redibujar la vista entera
  // mientras se escribe haría perder el foco de los campos.
  suscribir(() => dibujarNav(resolver().pestana));
  document.addEventListener(
    'scroll',
    () => nodos.cabecera.classList.toggle('desplazada', window.scrollY > 4),
    { passive: true }
  );
  registrarServicio();

  // Receta que llega desde el menú "Compartir" del móvil.
  const compartido = recogerCompartido();
  if (compartido) {
    vistaEditor.guardarCompartido(compartido);
    if (location.hash !== '#/nueva') {
      // Al cambiar el hash se dispara `hashchange`, que ya dibuja el editor.
      location.hash = '#/nueva';
      return;
    }
  }

  dibujar();
}

function registrarServicio() {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((error) => {
      console.warn('No se pudo registrar el service worker', error);
    });
  });
}

arrancar();
