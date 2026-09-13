/** Detalle de una receta: ingredientes, pasos y planificación. */
import { DIAS, formatoCorto, hoyISO, indiceDia, lunesDe, semanaDesde, sumarDias } from '../dates.js';
import { borrarReceta, alternarFavorita, planificar, recetaPorId } from '../store.js';
import { detectarPlataforma } from '../share.js';
import { abrirHoja, avisar, confirmar, el, icono, pintar } from '../ui.js';
import { buscarUnidad, formatearCantidad } from '../units.js';

/** Texto de la cantidad de un ingrediente ya escalada a las raciones elegidas. */
function textoCantidad(ing, factor) {
  if (ing.cantidad == null) return '';
  const cantidad = ing.cantidad * factor;
  const def = ing.unidad ? buscarUnidad(ing.unidad) : null;
  if (!def) return formatearCantidad(cantidad);
  const etiqueta = cantidad === 1 ? def.singular : def.plural;
  return `${formatearCantidad(cantidad)} ${etiqueta}`;
}

/**
 * Hoja para elegir día y momento. La usan el detalle y el planificador.
 * @param {(fecha:string, momento:string) => void} alElegir
 */
export function elegirDiaYMomento(alElegir, { titulo = 'Añadir a la semana' } = {}) {
  abrirHoja(titulo, (cerrar) => {
    let fecha = hoyISO();
    let momento = 'comida';

    const dias = [...semanaDesde(lunesDe(hoyISO())), ...semanaDesde(sumarDias(lunesDe(hoyISO()), 7))].filter(
      (d) => d >= hoyISO()
    );

    const chipsDias = el('div', { class: 'chips' });
    const chipsMomento = el('div', { class: 'chips' });

    const redibujar = () => {
      pintar(
        chipsDias,
        dias.map((d) =>
          el('button', {
            class: 'chip',
            type: 'button',
            'aria-pressed': String(d === fecha),
            text: d === hoyISO() ? 'Hoy' : `${DIAS[indiceDia(d)].slice(0, 3)} ${formatoCorto(d)}`,
            onclick: () => {
              fecha = d;
              redibujar();
            },
          })
        )
      );
      pintar(
        chipsMomento,
        [
          ['comida', '🍽️ Comida'],
          ['cena', '🌙 Cena'],
        ].map(([id, texto]) =>
          el('button', {
            class: 'chip',
            type: 'button',
            'aria-pressed': String(id === momento),
            text: texto,
            onclick: () => {
              momento = id;
              redibujar();
            },
          })
        )
      );
    };
    redibujar();

    return [
      el('p', { class: 'texto-secundario', text: '¿Qué día la preparas?' }),
      chipsDias,
      el('p', { class: 'texto-secundario', text: '¿Comida o cena?' }),
      chipsMomento,
      el('button', {
        class: 'boton boton-primario boton-bloque',
        type: 'button',
        text: 'Añadir a la semana',
        onclick: () => {
          alElegir(fecha, momento);
          cerrar();
        },
      }),
    ];
  });
}

export function vista(ctx) {
  const receta = recetaPorId(ctx.params.id);
  if (!receta) {
    return {
      titulo: 'Receta',
      atras: '#/recetario',
      contenido: el('p', { class: 'texto-secundario', text: 'Esta receta ya no existe.' }),
    };
  }

  const contenido = el('div');
  const plataforma = receta.url ? detectarPlataforma(receta.url) : null;
  // Estado efímero: sirve para no perderse cocinando, no se guarda.
  const tachados = new Set();
  const pasosHechos = new Set();
  let raciones = receta.raciones || null;

  if (receta.imagen) {
    contenido.append(
      el('img', {
        class: 'detalle-imagen',
        src: receta.imagen,
        alt: '',
        onerror: (e) => e.target.remove(),
      })
    );
  }

  contenido.append(el('h2', { text: receta.titulo }));

  const meta = el('div', { class: 'detalle-meta' }, [
    receta.minutos && el('span', {}, [icono('reloj', 16), `${receta.minutos} min`]),
    receta.raciones && el('span', {}, [icono('personas', 16), `${receta.raciones} raciones`]),
    plataforma && el('span', {}, [plataforma.emoji, ` ${plataforma.nombre}`]),
  ]);
  if (meta.children.length) contenido.append(meta);

  if (receta.etiquetas?.length) {
    contenido.append(
      el(
        'div',
        { class: 'chips' },
        receta.etiquetas.map((t) => el('span', { class: 'etiqueta', text: `#${t}` }))
      )
    );
  }

  contenido.append(
    el('div', { class: 'fila-botones' }, [
      el('button', { class: 'boton boton-primario', type: 'button', onclick: () => abrirPlanificador() }, [
        icono('calendario', 18),
        'A la semana',
      ]),
      el('button', { class: 'boton boton-fantasma', type: 'button', onclick: () => ctx.ir(`#/editar/${receta.id}`) }, [
        icono('lapiz', 18),
        'Editar',
      ]),
    ])
  );

  const abrirPlanificador = () =>
    elegirDiaYMomento((fecha, momento) => {
      planificar({ fecha, momento, recetaId: receta.id, raciones });
      avisar('Añadida a la semana', { accion: 'Ver', alPulsar: () => ctx.ir('#/semana') });
    });

  /* ----- Ingredientes ----- */

  const listaIngredientes = el('ul', { class: 'lista-limpia' });
  const rotuloRaciones = el('span');

  const dibujarIngredientes = () => {
    const factor = raciones && receta.raciones ? raciones / receta.raciones : 1;
    rotuloRaciones.textContent = raciones ? `${raciones} raciones` : 'Sin raciones';
    const nodos = [];
    let grupo = null;
    receta.ingredientes.forEach((ing, indice) => {
      if (ing.grupo && ing.grupo !== grupo) {
        grupo = ing.grupo;
        nodos.push(el('li', { class: 'grupo-titulo', text: grupo }));
      }
      const tachado = tachados.has(indice);
      nodos.push(
        el(
          'li',
          {
            class: `ingrediente ${tachado ? 'tachado' : ''}`,
            role: 'button',
            tabindex: '0',
            onclick: () => {
              if (tachado) tachados.delete(indice);
              else tachados.add(indice);
              dibujarIngredientes();
            },
            onkeydown: (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.target.click();
              }
            },
          },
          [
            el('span', { class: 'casilla' }, [icono('check', 14)]),
            el('span', {}, [
              el('span', { class: 'cantidad', text: textoCantidad(ing, factor) }),
              textoCantidad(ing, factor) ? ' ' : '',
              el('span', { class: 'nombre', text: ing.nombre }),
              ing.nota && el('span', { class: 'nota', text: ing.nota }),
            ]),
          ]
        )
      );
    });
    pintar(listaIngredientes, nodos);
  };

  const control = el('div', { class: 'raciones-control' }, [
    el('button', {
      type: 'button',
      'aria-label': 'Menos raciones',
      text: '−',
      onclick: () => {
        raciones = Math.max(1, (raciones || 2) - 1);
        dibujarIngredientes();
      },
    }),
    rotuloRaciones,
    el('button', {
      type: 'button',
      'aria-label': 'Más raciones',
      text: '+',
      onclick: () => {
        raciones = (raciones || 1) + 1;
        dibujarIngredientes();
      },
    }),
  ]);

  dibujarIngredientes();

  if (receta.ingredientes.length) {
    contenido.append(
      el('section', { class: 'seccion' }, [
        el('div', { class: 'seccion-cabecera' }, [
          el('h3', { text: `Ingredientes` }),
          receta.raciones ? control : null,
        ]),
        listaIngredientes,
      ])
    );
  }

  /* ----- Pasos ----- */

  if (receta.pasos.length) {
    const listaPasos = el('ol', { class: 'lista-limpia' });
    const dibujarPasos = () => {
      pintar(
        listaPasos,
        receta.pasos.map((paso, indice) =>
          el(
            'li',
            {
              class: `paso ${pasosHechos.has(indice) ? 'hecho' : ''}`,
              role: 'button',
              tabindex: '0',
              onclick: () => {
                if (pasosHechos.has(indice)) pasosHechos.delete(indice);
                else pasosHechos.add(indice);
                dibujarPasos();
              },
              onkeydown: (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.target.click();
                }
              },
            },
            [
              el('span', { class: 'paso-numero', text: String(indice + 1) }),
              el('span', { class: 'paso-texto', text: paso }),
            ]
          )
        )
      );
    };
    dibujarPasos();
    contenido.append(
      el('section', { class: 'seccion' }, [
        el('div', { class: 'seccion-cabecera' }, [el('h3', { text: 'Preparación' })]),
        listaPasos,
      ])
    );
  }

  if (receta.notas) {
    contenido.append(
      el('section', { class: 'seccion' }, [
        el('div', { class: 'seccion-cabecera' }, [el('h3', { text: 'Notas' })]),
        el('p', { class: 'texto-secundario', text: receta.notas }),
      ])
    );
  }

  if (receta.url) {
    contenido.append(
      el('a', { class: 'origen', href: receta.url, target: '_blank', rel: 'noopener noreferrer' }, [
        icono('enlace', 18),
        el('span', {}, [
          el('strong', { text: `Ver original en ${plataforma?.nombre || 'la web'}` }),
          receta.fuente || receta.url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 46),
        ]),
      ])
    );
  }

  contenido.append(
    el('hr', { class: 'separador' }),
    el('button', {
      class: 'boton boton-fantasma boton-bloque',
      type: 'button',
      onclick: async () => {
        if (await confirmar('¿Borrar receta?', `"${receta.titulo}" se eliminará del recetario y de la semana.`)) {
          borrarReceta(receta.id);
          avisar('Receta borrada');
          ctx.ir('#/recetario');
        }
      },
    }, [icono('papelera', 18), 'Borrar receta'])
  );

  return {
    titulo: receta.titulo,
    atras: '#/recetario',
    acciones: [
      el(
        'button',
        {
          class: `boton-icono ${receta.favorita ? 'activo' : ''}`,
          type: 'button',
          'aria-label': 'Favorita',
          onclick: (e) => {
            alternarFavorita(receta.id);
            e.currentTarget.classList.toggle('activo');
          },
        },
        [icono('corazon')]
      ),
    ],
    contenido,
  };
}
