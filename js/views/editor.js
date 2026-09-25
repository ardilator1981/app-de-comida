/** Alta y edición de recetas, con análisis del texto pegado de redes. */
import { parseReceta } from '../parser.js';
import { detectarPlataforma, extraerUrl, pedirMetadatos, PLATAFORMAS_LEIBLES } from '../share.js';
import { guardarReceta, recetaPorId } from '../store.js';
import { avisar, el, icono, pintar } from '../ui.js';
import { buscarUnidad, formatearCantidad, parseCantidad } from '../units.js';

/** Datos que llegan de una compartición y esperan a que se abra el editor. */
let compartidoPendiente = null;
export const guardarCompartido = (datos) => {
  compartidoPendiente = datos;
};

/** Sugerencias de unidades para el desplegable del editor. */
const UNIDADES_SUGERIDAS = ['g', 'kg', 'ml', 'l', 'cda', 'cdta', 'taza', 'ud', 'diente', 'lata', 'sobre', 'pizca', 'rodaja', 'rama', 'manojo'];

function filaIngrediente(ing, alBorrar) {
  const cantidad = el('input', {
    type: 'text',
    inputmode: 'decimal',
    placeholder: 'Cant.',
    'aria-label': 'Cantidad',
    value: ing.cantidad != null ? formatearCantidad(ing.cantidad) : '',
  });
  const unidad = el('input', {
    type: 'text',
    list: 'lista-unidades',
    placeholder: 'ud.',
    'aria-label': 'Unidad',
    value: ing.unidad ? buscarUnidad(ing.unidad)?.singular || ing.unidad : '',
  });
  const nombre = el('input', {
    type: 'text',
    placeholder: 'Ingrediente',
    'aria-label': 'Ingrediente',
    value: ing.nombre || '',
  });

  const fila = el('div', { class: 'fila-ingrediente' }, [
    cantidad,
    unidad,
    nombre,
    el('button', { class: 'boton-icono', type: 'button', 'aria-label': 'Quitar ingrediente', onclick: () => alBorrar(fila) }, [
      icono('cerrar', 18),
    ]),
  ]);
  // Guardamos los campos en el nodo para poder leerlos al guardar.
  fila.leer = () => {
    const texto = nombre.value.trim();
    if (!texto) return null;
    const def = unidad.value.trim() ? buscarUnidad(unidad.value.trim()) : null;
    return {
      cantidad: parseCantidad(cantidad.value.trim()),
      unidad: def ? def.id : unidad.value.trim() || null,
      nombre: texto,
      nota: ing.nota || '',
      ...(ing.grupo ? { grupo: ing.grupo } : {}),
    };
  };
  return fila;
}

function filaPaso(texto, numero, alBorrar) {
  const area = el('textarea', { placeholder: 'Describe el paso…', 'aria-label': `Paso ${numero}` });
  area.value = texto || '';
  const fila = el('div', { class: 'fila-paso' }, [
    el('span', { class: 'paso-numero', text: String(numero) }),
    area,
    el('button', { class: 'boton-icono', type: 'button', 'aria-label': 'Quitar paso', onclick: () => alBorrar(fila) }, [
      icono('cerrar', 18),
    ]),
  ]);
  fila.leer = () => area.value.trim() || null;
  return fila;
}

export function vista(ctx) {
  const editando = ctx.params.id ? recetaPorId(ctx.params.id) : null;
  const compartido = !editando ? compartidoPendiente : null;
  compartidoPendiente = null;

  const borrador = editando
    ? { ...editando, ingredientes: [...editando.ingredientes], pasos: [...editando.pasos] }
    : {
        titulo: compartido?.titulo || '',
        url: compartido?.url || '',
        imagen: '',
        fuente: '',
        raciones: null,
        minutos: null,
        etiquetas: [],
        ingredientes: [],
        pasos: [],
        notas: '',
      };

  const contenido = el('form', { onsubmit: (e) => e.preventDefault() });
  contenido.append(
    el('datalist', { id: 'lista-unidades' }, UNIDADES_SUGERIDAS.map((u) => el('option', { value: u })))
  );

  /* ----- Paso 1: enlace y texto pegado ----- */

  const campoUrl = el('input', {
    type: 'url',
    placeholder: 'https://www.tiktok.com/…',
    value: borrador.url,
    inputmode: 'url',
  });

  const insigniaOrigen = el('span', { class: 'texto-pequeno' });
  const estadoEnlace = el('div', { class: 'estado-enlace', hidden: true });
  const botonLeer = el('button', {
    class: 'boton boton-fantasma boton-pequeno',
    type: 'button',
    onclick: () => leerDelEnlace(),
  }, [icono('chispa', 16), 'Leer del enlace']);

  const actualizarInsignia = () => {
    const url = campoUrl.value.trim();
    const p = url ? detectarPlataforma(url) : null;
    insigniaOrigen.textContent = p ? `${p.emoji} Receta de ${p.nombre}` : '';
    botonLeer.hidden = !url;
  };
  campoUrl.addEventListener('input', actualizarInsignia);

  /** Pinta el estado de la lectura del enlace. */
  const mostrarEstado = (tipo, ...contenido) => {
    estadoEnlace.hidden = false;
    estadoEnlace.className = `estado-enlace estado-${tipo}`;
    pintar(estadoEnlace, contenido.flat().filter(Boolean));
  };

  /**
   * Pide la descripción del vídeo a la plataforma y, si llega, la analiza
   * sola. Es el camino corto: compartir el vídeo y que salga la receta.
   */
  async function leerDelEnlace() {
    const url = campoUrl.value.trim();
    if (!url) return;
    const plataforma = detectarPlataforma(url);

    if (!PLATAFORMAS_LEIBLES.includes(plataforma?.id)) {
      const nombre = !plataforma || plataforma.id === 'web' ? 'Esta web' : plataforma.nombre;
      mostrarEstado(
        'aviso',
        el('strong', { text: `${nombre} no deja leer la receta desde el enlace` }),
        el('p', { text: 'Selecciona los ingredientes y los pasos en la página, compártelos con la app o pégalos aquí abajo.' })
      );
      return;
    }

    botonLeer.disabled = true;
    mostrarEstado('cargando', el('span', { text: `Buscando la descripción en ${plataforma.nombre}…` }));

    const datos = await pedirMetadatos(url);
    botonLeer.disabled = false;

    if (!datos || !datos.titulo) {
      mostrarEstado(
        'aviso',
        el('strong', { text: `${plataforma.nombre} no me ha dado la descripción` }),
        el('p', { text: 'Puede ser un vídeo privado, un enlace acortado o que la app no responda ahora mismo. Pega el texto de la receta aquí abajo y funcionará igual.' }),
        el('button', { class: 'boton boton-fantasma boton-pequeno', type: 'button', text: 'Reintentar', onclick: () => leerDelEnlace() })
      );
      return;
    }

    if (datos.imagen && !campoImagen.value.trim()) campoImagen.value = datos.imagen;
    if (datos.autor) borrador.fuente = `@${datos.autor}`;
    if (!areaTexto.value.trim()) areaTexto.value = datos.titulo;

    // La descripción ya está: la analizamos sin que haya que pulsar nada.
    const leida = analizar({ silencioso: true });

    if (leida && leida.ingredientes.length) {
      mostrarEstado(
        'ok',
        el('strong', { text: `Receta leída de ${plataforma.nombre}` }),
        el('p', { text: `${leida.ingredientes.length} ingredientes y ${leida.pasos.length} pasos. Repásalos abajo por si algo no cuadra.` })
      );
    } else {
      mostrarEstado(
        'aviso',
        el('strong', { text: 'La descripción no trae los ingredientes' }),
        el('p', { text: 'Este vídeo explica la receta hablando o con texto dentro de la imagen, y eso no viaja en el enlace. Escríbelos abajo a mano.' })
      );
    }
  }

  const areaTexto = el('textarea', {
    placeholder:
      'Pega aquí la receta: ingredientes y pasos.\n\nEn una web de recetas puedes seleccionar el texto y compartirlo directamente con esta app.',
    'aria-label': 'Texto de la receta',
  });
  if (compartido?.texto) areaTexto.value = compartido.texto;

  /**
   * Lee el texto pegado y rellena el formulario.
   * @param {{silencioso?: boolean}} [opciones] - sin avisos emergentes cuando
   *   la llamada viene de la lectura automática del enlace.
   * @returns {object|null} la receta interpretada
   */
  const analizar = ({ silencioso = false } = {}) => {
    const texto = areaTexto.value.trim();
    if (!texto) {
      if (!silencioso) avisar('Pega primero el texto de la receta');
      return null;
    }
    const leida = parseReceta(texto, {
      titulo: campoTitulo.value.trim() || undefined,
      url: campoUrl.value.trim() || undefined,
    });
    if (leida.titulo !== 'Receta sin título') campoTitulo.value = leida.titulo;
    if (leida.raciones) campoRaciones.value = leida.raciones;
    if (leida.minutos) campoMinutos.value = leida.minutos;
    if (leida.etiquetas.length && !campoEtiquetas.value.trim()) campoEtiquetas.value = leida.etiquetas.join(', ');
    if (leida.notas && !campoNotas.value.trim()) campoNotas.value = leida.notas;
    if (!campoUrl.value.trim() && leida.url) {
      campoUrl.value = leida.url;
      actualizarInsignia();
    }
    borrador.ingredientes = leida.ingredientes;
    borrador.pasos = leida.pasos;
    dibujarIngredientes();
    dibujarPasos();
    if (!silencioso) {
      avisar(
        leida.ingredientes.length
          ? `He encontrado ${leida.ingredientes.length} ingredientes y ${leida.pasos.length} pasos`
          : 'No he reconocido ingredientes: revísalos abajo'
      );
    }
    detalles.open = true;
    return leida;
  };

  contenido.append(
    el('section', { class: 'seccion' }, [
      el('label', { class: 'campo' }, [el('span', { text: 'Enlace original' }), campoUrl]),
      el('div', { class: 'fila-enlace' }, [insigniaOrigen, botonLeer]),
      estadoEnlace,
      el('label', { class: 'campo', style: { marginTop: '12px' } }, [
        el('span', { text: 'Texto de la receta' }),
        areaTexto,
      ]),
      el('button', { class: 'boton boton-primario boton-bloque', type: 'button', onclick: () => analizar() }, [
        icono('chispa', 18),
        'Analizar y rellenar',
      ]),
      el('p', {
        class: 'texto-pequeno centrado',
        style: { marginTop: '8px' },
        text: 'Leo los ingredientes y los pasos automáticamente, y descarto valoraciones, botones y tablas nutricionales. Después puedes corregir lo que haga falta.',
      }),
    ])
  );

  /* ----- Paso 2: datos de la receta ----- */

  const campoTitulo = el('input', { type: 'text', placeholder: 'Pasta cremosa de calabacín', value: borrador.titulo, required: true });
  const campoRaciones = el('input', { type: 'number', min: '1', max: '30', placeholder: '2', value: borrador.raciones ?? '' });
  const campoMinutos = el('input', { type: 'number', min: '1', max: '999', placeholder: '25', value: borrador.minutos ?? '' });
  const campoImagen = el('input', { type: 'url', placeholder: 'https://…', value: borrador.imagen || '' });
  const campoEtiquetas = el('input', { type: 'text', placeholder: 'cena, rápido, vegetariano', value: (borrador.etiquetas || []).join(', ') });
  const campoNotas = el('textarea', { placeholder: 'Trucos, cambios que te gustan…', style: { minHeight: '80px' } });
  campoNotas.value = borrador.notas || '';

  const detalles = el('details', { open: Boolean(editando || borrador.ingredientes.length) });
  const listaIngredientes = el('div');
  const listaPasos = el('div');

  const dibujarIngredientes = () => {
    pintar(
      listaIngredientes,
      borrador.ingredientes.map((ing) => filaIngrediente(ing, (fila) => fila.remove()))
    );
  };
  const dibujarPasos = () => {
    pintar(
      listaPasos,
      borrador.pasos.map((paso, i) => filaPaso(paso, i + 1, (fila) => {
        fila.remove();
        renumerarPasos();
      }))
    );
  };
  const renumerarPasos = () => {
    [...listaPasos.children].forEach((fila, i) => {
      const numero = fila.querySelector('.paso-numero');
      if (numero) numero.textContent = String(i + 1);
    });
  };

  dibujarIngredientes();
  dibujarPasos();

  detalles.append(
    el('summary', { style: { cursor: 'pointer', fontWeight: '700', margin: '8px 0 14px' }, text: 'Detalles de la receta' }),
    el('label', { class: 'campo' }, [el('span', { text: 'Título' }), campoTitulo]),
    el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' } }, [
      el('label', { class: 'campo' }, [el('span', { text: 'Raciones' }), campoRaciones]),
      el('label', { class: 'campo' }, [el('span', { text: 'Minutos' }), campoMinutos]),
    ]),
    el('label', { class: 'campo' }, [el('span', { text: 'Etiquetas (separadas por comas)' }), campoEtiquetas]),
    el('label', { class: 'campo' }, [el('span', { text: 'Imagen (URL)' }), campoImagen]),

    el('div', { class: 'seccion-cabecera', style: { marginTop: '20px' } }, [
      el('h3', { text: 'Ingredientes' }),
      el('button', {
        class: 'boton boton-fantasma boton-pequeno',
        type: 'button',
        onclick: () => {
          listaIngredientes.append(filaIngrediente({}, (fila) => fila.remove()));
          listaIngredientes.lastElementChild.querySelector('input').focus();
        },
      }, [icono('mas', 16), 'Añadir']),
    ]),
    listaIngredientes,

    el('div', { class: 'seccion-cabecera', style: { marginTop: '20px' } }, [
      el('h3', { text: 'Pasos' }),
      el('button', {
        class: 'boton boton-fantasma boton-pequeno',
        type: 'button',
        onclick: () => {
          listaPasos.append(
            filaPaso('', listaPasos.children.length + 1, (fila) => {
              fila.remove();
              renumerarPasos();
            })
          );
          listaPasos.lastElementChild.querySelector('textarea').focus();
        },
      }, [icono('mas', 16), 'Añadir']),
    ]),
    listaPasos,

    el('label', { class: 'campo', style: { marginTop: '20px' } }, [el('span', { text: 'Notas' }), campoNotas])
  );
  contenido.append(detalles);

  /* ----- Guardar ----- */

  const guardar = () => {
    const titulo = campoTitulo.value.trim();
    if (!titulo) {
      avisar('Ponle un título a la receta');
      detalles.open = true;
      campoTitulo.focus();
      return;
    }
    const ingredientes = [...listaIngredientes.children].map((f) => f.leer()).filter(Boolean);
    const pasos = [...listaPasos.children].map((f) => f.leer()).filter(Boolean);

    const id = guardarReceta({
      id: editando?.id,
      titulo,
      url: campoUrl.value.trim(),
      imagen: campoImagen.value.trim(),
      fuente: borrador.fuente || '',
      raciones: campoRaciones.value ? Number(campoRaciones.value) : null,
      minutos: campoMinutos.value ? Number(campoMinutos.value) : null,
      etiquetas: campoEtiquetas.value
        .split(',')
        .map((t) => t.trim().replace(/^#/, '').toLowerCase())
        .filter(Boolean),
      ingredientes,
      pasos,
      notas: campoNotas.value.trim(),
      favorita: editando?.favorita || false,
    });
    avisar(editando ? 'Receta actualizada' : 'Receta guardada');
    ctx.ir(`#/receta/${id}`);
  };

  contenido.append(
    el('div', { style: { position: 'sticky', bottom: '0', paddingTop: '12px', paddingBottom: '4px', background: 'var(--fondo)' } }, [
      el('button', { class: 'boton boton-primario boton-bloque', type: 'button', onclick: guardar }, [
        icono('check', 18),
        editando ? 'Guardar cambios' : 'Guardar receta',
      ]),
    ])
  );

  actualizarInsignia();

  if (!editando) {
    if (areaTexto.value.trim()) {
      // Ya nos han compartido el texto de la receta: no hay nada que pedirle
      // al enlace, así que se analiza directamente.
      const leida = analizar({ silencioso: true });
      if (leida && leida.ingredientes.length) {
        mostrarEstado(
          'ok',
          el('strong', { text: 'Receta leída' }),
          el('p', { text: `${leida.ingredientes.length} ingredientes y ${leida.pasos.length} pasos. Repásalos abajo por si algo no cuadra.` })
        );
      } else {
        mostrarEstado(
          'aviso',
          el('strong', { text: 'No he reconocido los ingredientes' }),
          el('p', { text: 'Puede que falte parte del texto. Revísalo aquí abajo y vuelve a pulsar “Analizar y rellenar”.' })
        );
      }
    } else if (borrador.url) {
      // Solo tenemos el enlace: probamos a que la plataforma nos dé el texto.
      leerDelEnlace();
    }
  }

  // Un enlace suelto compartido sin texto: dejamos todo listo para pegar.
  if (compartido && !compartido.texto && compartido.titulo && !extraerUrl(compartido.titulo)) {
    areaTexto.value = compartido.titulo;
  }

  return {
    titulo: editando ? 'Editar receta' : 'Nueva receta',
    atras: editando ? `#/receta/${editando.id}` : '#/recetario',
    contenido,
  };
}
