/** Lista de la compra generada a partir de la semana planificada. */
import { clasificar } from '../categories.js';
import { hoyISO, lunesDe, rotuloSemana, semanaDesde, sumarDias } from '../dates.js';
import { compartirTexto } from '../share.js';
import { generarLista, listaComoTexto } from '../shopping.js';
import {
  alternarExtra,
  añadirExtra,
  fijarRango,
  limpiarMarcados,
  marcarArticulo,
  obtener,
  quitarExtra,
} from '../store.js';
import { avisar, confirmar, el, estadoVacio, icono, pintar } from '../ui.js';

/** Rangos predefinidos: casi siempre se compra por semanas. */
export function rangos() {
  const estaSemana = semanaDesde(lunesDe(hoyISO()));
  const proxima = semanaDesde(sumarDias(lunesDe(hoyISO()), 7));
  return [
    { id: 'actual', nombre: 'Esta semana', desde: estaSemana[0], hasta: estaSemana[6] },
    { id: 'proxima', nombre: 'Próxima semana', desde: proxima[0], hasta: proxima[6] },
    { id: 'todo', nombre: 'Todo lo planificado', desde: '', hasta: '' },
  ];
}

/** El rango elegido, o la semana en curso si aún no se ha tocado nada. */
export function rangoActivo() {
  const { lista } = obtener();
  const opciones = rangos();
  return opciones.find((r) => r.id === lista.rango) || opciones[0];
}

export function vista(ctx) {
  const estado = obtener();
  const contenido = el('div');
  const rango = rangoActivo();

  const comidas = estado.semana.filter((c) => {
    if (!rango.desde) return true;
    return c.fecha >= rango.desde && c.fecha <= rango.hasta;
  });

  const datos = generarLista({
    recetas: estado.recetas,
    comidas,
    extras: estado.lista.extras,
    hechos: estado.lista.hechos,
  });

  /* ----- Selector de semana ----- */

  contenido.append(
    el(
      'div',
      { class: 'chips' },
      rangos().map((r) =>
        el('button', {
          class: 'chip',
          type: 'button',
          'aria-pressed': String(r.id === rango.id),
          text: r.nombre,
          onclick: () => {
            fijarRango(r.id);
            ctx.redibujar();
          },
        })
      )
    )
  );

  if (rango.desde) {
    contenido.append(
      el('p', { class: 'texto-pequeno', style: { marginTop: '-6px' }, text: `${rotuloSemana(rango.desde)} · ${comidas.length} comidas planificadas` })
    );
  }

  /* ----- Resumen ----- */

  if (datos.total) {
    const porcentaje = datos.total ? Math.round((datos.hechos / datos.total) * 100) : 0;
    contenido.append(
      el('div', { class: 'resumen-lista' }, [
        el('span', { text: `${datos.hechos}/${datos.total}` }),
        el('div', { class: 'barra-progreso' }, [el('i', { style: { width: `${porcentaje}%` } })]),
        el('span', { text: datos.hechos === datos.total ? '¡Completa!' : `${datos.total - datos.hechos} por coger` }),
      ])
    );
  }

  /* ----- Artículos ----- */

  if (!datos.total) {
    contenido.append(
      estadoVacio({
        emoji: '🛒',
        titulo: 'La lista está vacía',
        mensaje: 'Planifica comidas en la pestaña “Semana” y aquí aparecerán todos los ingredientes sumados.',
        accion: 'Ir a la semana',
        alPulsar: () => ctx.ir('#/semana'),
      })
    );
  } else {
    for (const seccion of datos.secciones) {
      const bloque = el('section', { class: 'seccion-compra' }, [
        el('h3', {}, [el('span', { text: seccion.emoji }), seccion.nombre]),
      ]);
      for (const articulo of seccion.articulos) {
        const alternar = () => {
          if (articulo.tipo === 'extra') alternarExtra(articulo.clave);
          else marcarArticulo(articulo.clave, !articulo.hecho);
          ctx.redibujar();
        };
        const detalle = [
          articulo.notas.length ? articulo.notas.join(', ') : '',
          articulo.recetas.length > 1
            ? `${articulo.recetas.length} recetas`
            : articulo.recetas[0] || (articulo.tipo === 'extra' ? 'añadido a mano' : ''),
        ]
          .filter(Boolean)
          .join(' · ');

        bloque.append(
          el(
            'div',
            {
              class: `articulo ${articulo.hecho ? 'hecho' : ''}`,
              role: 'button',
              tabindex: '0',
              onclick: alternar,
              onkeydown: (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  alternar();
                }
              },
            },
            [
              el('span', { class: 'casilla' }, [icono('check', 14)]),
              el('span', { style: { flex: '1', minWidth: '0' } }, [
                el('span', { class: 'articulo-nombre', text: articulo.nombre }),
                detalle && el('span', { class: 'articulo-detalle', text: detalle }),
              ]),
              articulo.cantidad && el('span', { class: 'articulo-cantidad', text: articulo.cantidad }),
              articulo.tipo === 'extra'
                ? el('button', {
                    class: 'boton-icono',
                    type: 'button',
                    'aria-label': 'Quitar de la lista',
                    style: { width: '28px', height: '28px' },
                    onclick: (e) => {
                      e.stopPropagation();
                      quitarExtra(articulo.clave);
                      ctx.redibujar();
                    },
                  }, [icono('cerrar', 16)])
                : null,
            ]
          )
        );
      }
      contenido.append(bloque);
    }
  }

  /* ----- Añadir artículo suelto ----- */

  const entradaExtra = el('input', {
    type: 'text',
    placeholder: 'Añadir a la lista (papel de cocina…)',
    'aria-label': 'Añadir artículo',
  });
  const añadir = () => {
    const texto = entradaExtra.value.trim();
    if (!texto) return;
    añadirExtra(texto, clasificar(texto));
    entradaExtra.value = '';
    ctx.redibujar();
  };
  entradaExtra.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      añadir();
    }
  });

  contenido.append(
    el('div', { style: { display: 'flex', gap: '8px', marginTop: '18px' } }, [
      entradaExtra,
      el('button', { class: 'boton boton-primario', type: 'button', 'aria-label': 'Añadir', onclick: añadir }, [icono('mas', 20)]),
    ])
  );

  /* ----- Acciones ----- */

  if (datos.total) {
    contenido.append(
      el('div', { class: 'fila-botones', style: { marginTop: '16px' } }, [
        el('button', {
          class: 'boton boton-fantasma',
          type: 'button',
          onclick: async () => {
            const texto = listaComoTexto(datos, `🛒 Lista de la compra${rango.desde ? ` · ${rotuloSemana(rango.desde)}` : ''}`);
            const resultado = await compartirTexto(texto, 'Lista de la compra');
            if (resultado === 'copiado') avisar('Lista copiada al portapapeles');
            else if (resultado === 'error') avisar('No he podido compartir la lista');
          },
        }, [icono('compartir', 18), 'Compartir']),
        el('button', {
          class: 'boton boton-fantasma',
          type: 'button',
          onclick: async () => {
            if (!datos.hechos) {
              avisar('No hay nada marcado todavía');
              return;
            }
            if (await confirmar('¿Vaciar lo marcado?', 'Se desmarcarán los ingredientes y se borrarán los artículos añadidos a mano que ya tengas.', { textoConfirmar: 'Sí, limpiar' })) {
              limpiarMarcados();
              ctx.redibujar();
            }
          },
        }, [icono('papelera', 18), 'Limpiar']),
      ])
    );
  }

  return { titulo: 'Lista de la compra', contenido };
}
