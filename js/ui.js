/** Ayudas de interfaz: creación de nodos, iconos, avisos y hojas modales. */

/**
 * Crea un elemento. `props` admite atributos, `class`, `dataset`, `style`,
 * manejadores `onclick`, y `html` para contenido ya construido.
 * @param {string} tag
 * @param {object} [props]
 * @param {Array<Node|string|null|false|undefined>|Node|string} [hijos]
 */
export function el(tag, props = {}, hijos = []) {
  const nodo = document.createElement(tag);
  for (const [clave, valor] of Object.entries(props || {})) {
    if (valor == null || valor === false) continue;
    if (clave === 'class') nodo.className = valor;
    else if (clave === 'html') nodo.innerHTML = valor;
    else if (clave === 'text') nodo.textContent = valor;
    else if (clave === 'dataset') Object.assign(nodo.dataset, valor);
    else if (clave === 'style') Object.assign(nodo.style, valor);
    else if (clave.startsWith('on') && typeof valor === 'function') {
      nodo.addEventListener(clave.slice(2).toLowerCase(), valor);
    } else if (valor === true) nodo.setAttribute(clave, '');
    else nodo.setAttribute(clave, valor);
  }
  for (const hijo of [].concat(hijos)) {
    if (hijo == null || hijo === false || hijo === '') continue;
    nodo.append(hijo instanceof Node ? hijo : document.createTextNode(String(hijo)));
  }
  return nodo;
}

/** Vacía un contenedor y le pone contenido nuevo. */
export function pintar(contenedor, ...contenido) {
  contenedor.replaceChildren(...contenido.flat().filter(Boolean));
  return contenedor;
}

/* ------------------------------------------------------------------ */
/* Iconos (SVG en línea, heredan el color del texto)                  */
/* ------------------------------------------------------------------ */

const TRAZOS = {
  libro: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z',
  calendario: 'M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z',
  carrito: 'M8 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM19 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM2 2h2l2.7 12.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L22 7H5.1',
  ajustes: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 13.5a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-3-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-3l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h.1A1.7 1.7 0 0 0 10 3.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.5 1z',
  mas: 'M12 5v14M5 12h14',
  atras: 'M15 18l-6-6 6-6',
  cerrar: 'M18 6L6 18M6 6l12 12',
  buscar: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  reloj: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  personas: 'M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 20v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  corazon: 'M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1 7.8 7.8 7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z',
  papelera: 'M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6M10 11v6M14 11v6',
  lapiz: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  enlace: 'M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7',
  compartir: 'M4 12v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8M16 6l-4-4-4 4M12 2v14',
  copiar: 'M9 9h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1zM5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1',
  chispa: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z',
  izquierda: 'M15 18l-6-6 6-6',
  derecha: 'M9 6l6 6-6 6',
  check: 'M20 6L9 17l-5-5',
  descargar: 'M12 3v12m0 0l4-4m-4 4l-4-4M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2',
  subir: 'M12 21V9m0 0l4 4M12 9l-4 4M4 5V4a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v1',
  nota: 'M8 3h8a2 2 0 0 1 2 2v14l-6-3-6 3V5a2 2 0 0 1 2-2z',
};

/**
 * Devuelve un icono SVG.
 * @param {keyof TRAZOS} nombre
 */
export function icono(nombre, tamano = 20) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', tamano);
  svg.setAttribute('height', tamano);
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.8');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('icono');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', TRAZOS[nombre] || '');
  svg.append(path);
  return svg;
}

/* ------------------------------------------------------------------ */
/* Avisos                                                             */
/* ------------------------------------------------------------------ */

let temporizadorAviso = null;

/** Muestra un mensaje breve abajo del todo. */
export function avisar(mensaje, { accion, alPulsar } = {}) {
  let caja = document.getElementById('aviso');
  if (!caja) {
    caja = el('div', { id: 'aviso', class: 'aviso', role: 'status', 'aria-live': 'polite' });
    document.body.append(caja);
  }
  pintar(
    caja,
    el('span', { text: mensaje }),
    accion &&
      el('button', {
        class: 'aviso-accion',
        type: 'button',
        onclick: () => {
          caja.classList.remove('visible');
          alPulsar?.();
        },
        text: accion,
      })
  );
  caja.classList.add('visible');
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => caja.classList.remove('visible'), accion ? 6000 : 2800);
}

/* ------------------------------------------------------------------ */
/* Hoja modal                                                         */
/* ------------------------------------------------------------------ */

/**
 * Abre una hoja deslizante desde abajo.
 * @param {string} titulo
 * @param {(cerrar:() => void) => Node|Node[]} construirContenido
 * @param {{alCerrar?: () => void}} [opciones] - `alCerrar` se ejecuta siempre,
 *   también si se cierra con Escape o tocando fuera.
 */
export function abrirHoja(titulo, construirContenido, opciones = {}) {
  const fondo = el('div', { class: 'hoja-fondo' });
  const hoja = el('div', { class: 'hoja', role: 'dialog', 'aria-modal': 'true', 'aria-label': titulo });

  let cerrada = false;
  const cerrar = () => {
    if (cerrada) return;
    cerrada = true;
    fondo.classList.remove('visible');
    hoja.classList.remove('visible');
    document.removeEventListener('keydown', alTeclado);
    setTimeout(() => fondo.remove(), 220);
    opciones.alCerrar?.();
  };
  const alTeclado = (e) => {
    if (e.key === 'Escape') cerrar();
  };

  const cabecera = el('header', { class: 'hoja-cabecera' }, [
    el('h2', { text: titulo }),
    el('button', { class: 'boton-icono', type: 'button', 'aria-label': 'Cerrar', onclick: cerrar }, [icono('cerrar')]),
  ]);
  const cuerpo = el('div', { class: 'hoja-cuerpo' }, [].concat(construirContenido(cerrar)));

  hoja.append(el('div', { class: 'hoja-asa' }), cabecera, cuerpo);
  fondo.append(hoja);
  fondo.addEventListener('click', (e) => {
    if (e.target === fondo) cerrar();
  });
  document.addEventListener('keydown', alTeclado);
  document.body.append(fondo);
  requestAnimationFrame(() => {
    fondo.classList.add('visible');
    hoja.classList.add('visible');
  });
  return cerrar;
}

/** Confirmación con dos botones. Devuelve una promesa con true/false. */
export function confirmar(titulo, mensaje, { textoConfirmar = 'Sí, borrar', peligro = true } = {}) {
  return new Promise((resolver) => {
    let respuesta = false;
    const cerrar = abrirHoja(
      titulo,
      (cierra) => [
        el('p', { class: 'texto-secundario', text: mensaje }),
        el('div', { class: 'fila-botones' }, [
          el('button', { class: 'boton boton-fantasma', type: 'button', text: 'Cancelar', onclick: cierra }),
          el('button', {
            class: `boton ${peligro ? 'boton-peligro' : 'boton-primario'}`,
            type: 'button',
            text: textoConfirmar,
            onclick: () => {
              respuesta = true;
              cierra();
            },
          }),
        ]),
      ],
      // Cerrar con Escape o tocando fuera equivale a cancelar.
      { alCerrar: () => resolver(respuesta) }
    );
    return cerrar;
  });
}

/** Estado vacío con icono, texto y acción opcional. */
export function estadoVacio({ emoji = '🍳', titulo, mensaje, accion, alPulsar }) {
  return el('div', { class: 'vacio' }, [
    el('div', { class: 'vacio-emoji', text: emoji }),
    el('h3', { text: titulo }),
    mensaje && el('p', { text: mensaje }),
    accion && el('button', { class: 'boton boton-primario', type: 'button', text: accion, onclick: alPulsar }),
  ]);
}

/** Escapa texto para insertarlo en HTML. */
export const escapar = (t) =>
  String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
