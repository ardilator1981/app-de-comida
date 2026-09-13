/** Vista principal: todas las recetas guardadas. */
import { alternarFavorita, obtener } from '../store.js';
import { emojiDeReceta } from '../emoji.js';
import { detectarPlataforma } from '../share.js';
import { el, estadoVacio, icono, pintar } from '../ui.js';
import { normalizar } from '../units.js';

const filtros = { texto: '', etiqueta: '', soloFavoritas: false };

/** Tarjeta de receta reutilizable en el recetario y en los buscadores. */
export function tarjetaReceta(receta, alAbrir, { compacta = false } = {}) {
  const plataforma = receta.url ? detectarPlataforma(receta.url) : null;
  const emoji = emojiDeReceta(receta.titulo);
  const portada = receta.imagen
    ? el('img', {
        class: 'tarjeta-imagen',
        src: receta.imagen,
        alt: '',
        loading: 'lazy',
        onerror: (e) => {
          // Las miniaturas de redes caducan: si falla, mostramos el emoji.
          e.target.replaceWith(el('div', { class: 'tarjeta-emoji', text: emoji }));
        },
      })
    : el('div', { class: 'tarjeta-emoji', text: emoji });

  const meta = el('div', { class: 'tarjeta-meta' }, [
    receta.minutos && el('span', {}, [icono('reloj', 13), `${receta.minutos} min`]),
    receta.raciones && el('span', {}, [icono('personas', 13), `${receta.raciones}`]),
    !receta.minutos && !receta.raciones && receta.ingredientes?.length
      ? el('span', { text: `${receta.ingredientes.length} ingredientes` })
      : null,
    plataforma && el('span', { text: plataforma.emoji, title: plataforma.nombre }),
  ]);

  const tarjeta = el('button', { class: 'tarjeta', type: 'button', onclick: () => alAbrir(receta) }, [
    portada,
    el('div', { class: 'tarjeta-cuerpo' }, [
      el('div', { class: 'tarjeta-titulo', text: receta.titulo }),
      !compacta && meta,
    ]),
  ]);

  if (!compacta) {
    tarjeta.append(
      el(
        'button',
        {
          class: `favorita ${receta.favorita ? 'activa' : ''}`,
          type: 'button',
          'aria-label': receta.favorita ? 'Quitar de favoritas' : 'Marcar como favorita',
          onclick: (e) => {
            e.stopPropagation();
            alternarFavorita(receta.id);
          },
        },
        [icono('corazon', 16)]
      )
    );
  }
  return tarjeta;
}

/** Filtra el recetario según la búsqueda activa. */
function filtrar(recetas) {
  const consulta = normalizar(filtros.texto);
  return recetas.filter((r) => {
    if (filtros.soloFavoritas && !r.favorita) return false;
    if (filtros.etiqueta && !(r.etiquetas || []).includes(filtros.etiqueta)) return false;
    if (!consulta) return true;
    const enTitulo = normalizar(r.titulo).includes(consulta);
    const enIngredientes = (r.ingredientes || []).some((i) => normalizar(i.nombre).includes(consulta));
    const enEtiquetas = (r.etiquetas || []).some((t) => normalizar(t).includes(consulta));
    return enTitulo || enIngredientes || enEtiquetas;
  });
}

export function vista(ctx) {
  const { recetas } = obtener();
  const contenido = el('div');

  const resultados = el('div');

  const dibujarResultados = () => {
    const lista = filtrar(recetas);
    if (!recetas.length) {
      pintar(
        resultados,
        estadoVacio({
          emoji: '📱',
          titulo: 'Tu recetario está vacío',
          mensaje:
            'Comparte un vídeo de TikTok o Instagram con esta app, o pega la receta a mano, y la guardaré aquí.',
          accion: 'Añadir mi primera receta',
          alPulsar: () => ctx.ir('#/nueva'),
        }),
        el('p', { class: 'centrado' }, [
          el('button', {
            class: 'boton boton-fantasma boton-pequeno',
            type: 'button',
            text: 'Cómo mandar recetas desde TikTok',
            onclick: () => ctx.ir('#/ajustes'),
          }),
        ])
      );
      return;
    }
    if (!lista.length) {
      pintar(
        resultados,
        estadoVacio({
          emoji: '🔍',
          titulo: 'Sin resultados',
          mensaje: 'Prueba con otra palabra o quita los filtros.',
        })
      );
      return;
    }
    pintar(
      resultados,
      el(
        'div',
        { class: 'rejilla' },
        lista.map((r) => tarjetaReceta(r, (receta) => ctx.ir(`#/receta/${receta.id}`)))
      )
    );
  };

  if (recetas.length) {
    const entrada = el('input', {
      type: 'search',
      placeholder: 'Buscar receta o ingrediente…',
      value: filtros.texto,
      'aria-label': 'Buscar en el recetario',
      oninput: (e) => {
        filtros.texto = e.target.value;
        dibujarResultados();
      },
    });
    contenido.append(el('div', { class: 'buscador' }, [icono('buscar', 18), entrada]));

    const etiquetas = [...new Set(recetas.flatMap((r) => r.etiquetas || []))].sort((a, b) =>
      a.localeCompare(b, 'es')
    );
    const chips = el('div', { class: 'chips' });
    const crearChip = (texto, activo, alPulsar) =>
      el('button', {
        class: 'chip',
        type: 'button',
        'aria-pressed': String(activo),
        text: texto,
        onclick: () => {
          alPulsar();
          redibujarChips();
          dibujarResultados();
        },
      });
    const redibujarChips = () => {
      pintar(chips, [
        crearChip('❤️ Favoritas', filtros.soloFavoritas, () => {
          filtros.soloFavoritas = !filtros.soloFavoritas;
        }),
        ...etiquetas.slice(0, 20).map((t) =>
          crearChip(`#${t}`, filtros.etiqueta === t, () => {
            filtros.etiqueta = filtros.etiqueta === t ? '' : t;
          })
        ),
      ]);
    };
    redibujarChips();
    if (etiquetas.length || recetas.some((r) => r.favorita)) contenido.append(chips);
  }

  dibujarResultados();
  contenido.append(resultados);

  return {
    titulo: 'Recetario',
    contenido,
    fab: recetas.length
      ? el('button', { class: 'fab', type: 'button', onclick: () => ctx.ir('#/nueva') }, [
          icono('mas', 22),
          'Receta',
        ])
      : null,
  };
}
