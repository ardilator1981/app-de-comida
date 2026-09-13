/** Planificador semanal: qué se come cada día. */
import {
  DIAS,
  formatoCorto,
  hoyISO,
  indiceDia,
  lunesDe,
  rotuloSemana,
  semanaDesde,
  sumarDias,
} from '../dates.js';
import { emojiDeReceta } from '../emoji.js';
import { moverComida, obtener, planificar, quitarComida, recetaPorId } from '../store.js';
import { abrirHoja, avisar, el, estadoVacio, icono, pintar } from '../ui.js';
import { normalizar } from '../units.js';

/** Lunes que se está mostrando. Se conserva al cambiar de pestaña. */
let lunesVisible = lunesDe(hoyISO());

export const semanaActual = () => semanaDesde(lunesVisible);

/** Selector de receta con buscador, para asignarla a un hueco del día. */
function elegirReceta(alElegir) {
  const { recetas } = obtener();
  abrirHoja('Elegir receta', (cerrar) => {
    if (!recetas.length) {
      return estadoVacio({
        emoji: '📖',
        titulo: 'Aún no tienes recetas',
        mensaje: 'Guarda alguna primero y podrás planificarla aquí.',
      });
    }
    const resultados = el('div', { class: 'lista-seleccion' });
    const dibujar = (consulta = '') => {
      const q = normalizar(consulta);
      const lista = recetas.filter((r) => !q || normalizar(r.titulo).includes(q));
      pintar(
        resultados,
        lista.length
          ? lista.map((r) =>
              el(
                'button',
                {
                  class: 'tarjeta-ajuste',
                  type: 'button',
                  onclick: () => {
                    alElegir(r);
                    cerrar();
                  },
                },
                [
                  r.imagen
                    ? el('img', {
                        src: r.imagen,
                        alt: '',
                        style: { width: '44px', height: '44px', borderRadius: '10px', objectFit: 'cover' },
                        onerror: (e) => e.target.replaceWith(el('span', { class: 'mini-emoji', text: emojiDeReceta(r.titulo) })),
                      })
                    : el('span', { class: 'mini-emoji', text: emojiDeReceta(r.titulo) }),
                  el('div', {}, [
                    el('strong', { text: r.titulo }),
                    el('small', {
                      text: [r.minutos && `${r.minutos} min`, r.raciones && `${r.raciones} raciones`]
                        .filter(Boolean)
                        .join(' · '),
                    }),
                  ]),
                ]
              )
            )
          : el('p', { class: 'texto-secundario centrado', text: 'Ninguna receta coincide.' })
      );
    };
    dibujar();
    const buscador = el('div', { class: 'buscador' }, [
      icono('buscar', 18),
      el('input', {
        type: 'search',
        placeholder: 'Buscar receta…',
        'aria-label': 'Buscar receta',
        oninput: (e) => dibujar(e.target.value),
      }),
    ]);
    return [buscador, resultados];
  });
}

/** Acciones disponibles al tocar una comida ya planificada. */
function abrirAccionesComida(comida, receta, ctx) {
  abrirHoja(receta ? receta.titulo : 'Comida', (cerrar) => [
    el('button', {
      class: 'tarjeta-ajuste',
      type: 'button',
      onclick: () => {
        cerrar();
        ctx.ir(`#/receta/${comida.recetaId}`);
      },
    }, [icono('libro', 20), el('div', {}, [el('strong', { text: 'Ver la receta' }), el('small', { text: 'Ingredientes y pasos' })])]),
    el('button', {
      class: 'tarjeta-ajuste',
      type: 'button',
      onclick: () => {
        cerrar();
        moverA(comida, ctx);
      },
    }, [icono('calendario', 20), el('div', {}, [el('strong', { text: 'Cambiar de día' }), el('small', { text: 'Mover a otro hueco' })])]),
    el('button', {
      class: 'tarjeta-ajuste',
      type: 'button',
      onclick: () => {
        quitarComida(comida.id);
        cerrar();
        avisar('Quitada de la semana');
      },
    }, [icono('papelera', 20), el('div', {}, [el('strong', { text: 'Quitar de la semana' })])]),
  ]);
}

function moverA(comida, ctx) {
  abrirHoja('Cambiar de día', (cerrar) => {
    const dias = semanaDesde(lunesVisible);
    return [
      el('p', { class: 'texto-secundario', text: 'Elige el nuevo hueco:' }),
      ...dias.map((fecha) =>
        el('div', { style: { marginBottom: '8px' } }, [
          el('div', { class: 'texto-pequeno', text: `${DIAS[indiceDia(fecha)]} ${formatoCorto(fecha)}` }),
          el('div', { class: 'fila-botones', style: { marginTop: '4px' } }, [
            el('button', {
              class: 'boton boton-fantasma boton-pequeno',
              type: 'button',
              text: '🍽️ Comida',
              onclick: () => {
                moverComida(comida.id, fecha, 'comida');
                cerrar();
              },
            }),
            el('button', {
              class: 'boton boton-fantasma boton-pequeno',
              type: 'button',
              text: '🌙 Cena',
              onclick: () => {
                moverComida(comida.id, fecha, 'cena');
                cerrar();
              },
            }),
          ]),
        ])
      ),
    ];
  });
}

export function vista(ctx) {
  const { semana } = obtener();
  const dias = semanaDesde(lunesVisible);
  const contenido = el('div');

  const rotulo = el('h2', { text: rotuloSemana(lunesVisible) });
  const cambiarSemana = (delta) => {
    lunesVisible = sumarDias(lunesVisible, delta * 7);
    ctx.redibujar();
  };

  contenido.append(
    el('div', { class: 'semana-barra' }, [
      el('button', { class: 'boton-icono', type: 'button', 'aria-label': 'Semana anterior', onclick: () => cambiarSemana(-1) }, [
        icono('izquierda'),
      ]),
      rotulo,
      el('button', { class: 'boton-icono', type: 'button', 'aria-label': 'Semana siguiente', onclick: () => cambiarSemana(1) }, [
        icono('derecha'),
      ]),
    ])
  );

  if (lunesVisible !== lunesDe(hoyISO())) {
    contenido.append(
      el('button', {
        class: 'boton boton-fantasma boton-pequeno',
        type: 'button',
        text: 'Volver a esta semana',
        style: { marginBottom: '12px' },
        onclick: () => {
          lunesVisible = lunesDe(hoyISO());
          ctx.redibujar();
        },
      })
    );
  }

  const comidasSemana = semana.filter((c) => dias.includes(c.fecha));

  for (const fecha of dias) {
    const tarjeta = el('article', { class: `dia ${fecha === hoyISO() ? 'hoy' : ''}` }, [
      el('div', { class: 'dia-cabecera' }, [
        el('h3', { text: DIAS[indiceDia(fecha)] }),
        el('span', { class: 'fecha', text: formatoCorto(fecha) }),
        fecha === hoyISO() ? el('span', { class: 'insignia-hoy', text: 'HOY' }) : null,
      ]),
    ]);

    for (const [momento, etiqueta] of [
      ['comida', 'Comida'],
      ['cena', 'Cena'],
    ]) {
      const asignadas = comidasSemana.filter((c) => c.fecha === fecha && c.momento === momento);
      const contenidoMomento = el('div', { class: 'momento-contenido' });

      for (const comida of asignadas) {
        const receta = recetaPorId(comida.recetaId);
        contenidoMomento.append(
          el(
            'div',
            {
              class: 'comida',
              role: 'button',
              tabindex: '0',
              onclick: () => abrirAccionesComida(comida, receta, ctx),
              onkeydown: (e) => {
                if (e.key === 'Enter') e.target.click();
              },
            },
            [
              receta?.imagen
                ? el('img', {
                    src: receta.imagen,
                    alt: '',
                    onerror: (e) => e.target.replaceWith(el('span', { class: 'mini-emoji', text: emojiDeReceta(receta.titulo) })),
                  })
                : el('span', { class: 'mini-emoji', text: emojiDeReceta(receta?.titulo) }),
              el('span', { class: 'titulo', text: receta ? receta.titulo : 'Receta borrada' }),
              icono('derecha', 16),
            ]
          )
        );
      }

      contenidoMomento.append(
        el('button', {
          class: 'anadir-comida',
          type: 'button',
          onclick: () =>
            elegirReceta((receta) => {
              planificar({ fecha, momento, recetaId: receta.id, raciones: receta.raciones });
              ctx.redibujar();
            }),
        }, [icono('mas', 14), asignadas.length ? 'Añadir otra' : 'Añadir'])
      );

      tarjeta.append(
        el('div', { class: 'momento' }, [
          el('span', { class: 'momento-etiqueta', text: etiqueta }),
          contenidoMomento,
        ])
      );
    }

    contenido.append(tarjeta);
  }

  if (comidasSemana.length) {
    contenido.append(
      el('button', {
        class: 'boton boton-primario boton-bloque',
        type: 'button',
        style: { marginTop: '10px' },
        onclick: () => ctx.ir('#/lista'),
      }, [icono('carrito', 18), `Ver la lista de la compra (${comidasSemana.length} comidas)`])
    );
  } else {
    contenido.append(
      el('p', { class: 'texto-secundario centrado', style: { marginTop: '18px' }, text: 'Toca “Añadir” en cualquier día para empezar a organizar la semana.' })
    );
  }

  return { titulo: 'Semana', contenido };
}
