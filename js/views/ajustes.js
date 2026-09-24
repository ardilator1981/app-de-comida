/** Ajustes: instalación, copias de seguridad y ayuda. */
import { descargarCopia, resumenCopia } from '../backup.js';
import { borrarTodo, importar, obtener } from '../store.js';
import { abrirHoja, avisar, confirmar, el, icono } from '../ui.js';

/** Instrucciones de instalación según el sistema del móvil. */
function ayudaInstalacion() {
  const ua = navigator.userAgent;
  const esIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const instalada = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;

  if (instalada && !esIOS) {
    return [
      el('p', {}, [
        'Ya tienes la app instalada. Cuando veas una receta en ',
        el('strong', { text: 'TikTok o Instagram' }),
        ', pulsa ',
        el('strong', { text: 'Compartir' }),
        ' y elige ',
        el('strong', { text: 'Recetario' }),
        ' en la lista de apps: se abrirá aquí con el enlace listo.',
      ]),
      el('p', { class: 'texto-secundario', text: 'Consejo: copia también la descripción del vídeo (mantén pulsado → Copiar) y pégala en “Texto de la receta” para que detecte los ingredientes.' }),
    ];
  }

  if (esIOS) {
    return [
      el('p', {}, [
        el('strong', { text: 'En iPhone: ' }),
        'abre esta página en Safari, pulsa el botón ',
        el('strong', { text: 'Compartir' }),
        ' y elige ',
        el('strong', { text: 'Añadir a pantalla de inicio' }),
        '.',
      ]),
      el('p', { class: 'texto-secundario' }, [
        'iOS no deja que las webs aparezcan en el menú “Compartir”. Para meter una receta: copia el enlace o la descripción en TikTok/Instagram, abre la app y pulsa ',
        el('strong', { text: '+ Receta' }),
        '. Al abrir el editor, pega con un toque largo.',
      ]),
    ];
  }

  return [
    el('p', {}, [
      el('strong', { text: 'En Android: ' }),
      'abre el menú del navegador (⋮) y pulsa ',
      el('strong', { text: 'Instalar aplicación' }),
      ' o ',
      el('strong', { text: 'Añadir a pantalla de inicio' }),
      '.',
    ]),
    el('p', { class: 'texto-secundario', text: 'Una vez instalada, la app aparecerá en el menú “Compartir” de TikTok e Instagram y podrás mandarle recetas con dos toques.' }),
  ];
}

function abrirImportar(ctx) {
  const entrada = el('input', { type: 'file', accept: 'application/json,.json', style: { display: 'none' } });
  entrada.addEventListener('change', async () => {
    const fichero = entrada.files?.[0];
    if (!fichero) return;
    try {
      const resumen = importar(await fichero.text(), 'fusionar');
      avisar(resumen.recetas ? `Importadas ${resumen.recetas} recetas` : 'No había recetas nuevas que importar');
      ctx.redibujar();
    } catch (error) {
      console.error(error);
      avisar('No he podido leer ese archivo');
    } finally {
      entrada.remove();
    }
  });
  document.body.append(entrada);
  entrada.click();
}

export function vista(ctx) {
  const estado = obtener();
  const contenido = el('div');

  const totalIngredientes = estado.recetas.reduce((n, r) => n + (r.ingredientes?.length || 0), 0);

  contenido.append(
    el('div', { class: 'aviso-caja' }, [
      el('strong', { text: `${estado.recetas.length} recetas · ${estado.semana.length} comidas planificadas` }),
      el('div', { class: 'texto-pequeno', text: `${totalIngredientes} ingredientes guardados. Todo se queda en este dispositivo.` }),
    ])
  );

  contenido.append(
    el('section', { class: 'seccion' }, [
      el('h3', { text: 'Cómo mandar recetas desde TikTok o Instagram' }),
      el('div', { class: 'aviso-caja', style: { marginTop: '10px' } }, ayudaInstalacion()),
    ])
  );

  contenido.append(
    el('section', { class: 'seccion' }, [
      el('h3', { text: 'Copia de seguridad' }),
      el('p', { class: 'texto-secundario', text: 'Las recetas viven solo en este móvil. Descarga una copia de vez en cuando, o para pasarlas a otro dispositivo.' }),
      el('div', { class: 'aviso-caja' }, [el('strong', { text: resumenCopia() })]),
      el('button', {
        class: 'tarjeta-ajuste',
        type: 'button',
        onclick: () => {
          descargarCopia();
          avisar('Copia descargada');
          ctx.redibujar();
        },
      }, [
        icono('descargar', 20),
        el('div', {}, [el('strong', { text: 'Descargar copia' }), el('small', { text: 'Guarda un archivo .json con todo' })]),
      ]),
      el('button', { class: 'tarjeta-ajuste', type: 'button', onclick: () => abrirImportar(ctx) }, [
        icono('subir', 20),
        el('div', {}, [el('strong', { text: 'Importar copia' }), el('small', { text: 'Añade las recetas de un archivo' })]),
      ]),
    ])
  );

  contenido.append(
    el('section', { class: 'seccion' }, [
      el('h3', { text: 'Ayuda' }),
      el('button', {
        class: 'tarjeta-ajuste',
        type: 'button',
        onclick: () =>
          abrirHoja('Cómo funciona', () => [
            el('p', {}, [el('strong', { text: '1. Guarda. ' }), 'Comparte el vídeo con la app o pega la descripción; se leen solos los ingredientes y los pasos.']),
            el('p', {}, [el('strong', { text: '2. Planifica. ' }), 'En “Semana”, coloca cada receta en su día, en la comida o en la cena.']),
            el('p', {}, [el('strong', { text: '3. Compra. ' }), 'La lista suma los ingredientes de todas las recetas de la semana y los ordena por secciones del súper.']),
            el('p', {}, [el('strong', { text: '4. Cocina. ' }), 'Abre la receta desde el día correspondiente y ve tachando ingredientes y pasos.']),
          ]),
      }, [
        icono('chispa', 20),
        el('div', {}, [el('strong', { text: 'Cómo funciona' }), el('small', { text: 'Guardar, planificar, comprar y cocinar' })]),
      ]),
    ])
  );

  contenido.append(
    el('section', { class: 'seccion' }, [
      el('h3', { text: 'Zona peligrosa' }),
      el('button', {
        class: 'boton boton-fantasma boton-bloque',
        type: 'button',
        onclick: async () => {
          if (
            await confirmar('¿Borrar todo?', 'Se eliminarán todas las recetas, la semana y la lista. No se puede deshacer.', {
              textoConfirmar: 'Sí, borrar todo',
            })
          ) {
            borrarTodo();
            avisar('Todo borrado');
            ctx.ir('#/recetario');
          }
        },
      }, [icono('papelera', 18), 'Borrar todos mis datos']),
    ])
  );

  contenido.append(
    el('p', { class: 'texto-pequeno centrado', style: { marginTop: '28px' }, text: 'Recetario · funciona sin conexión · tus datos no salen del móvil' })
  );

  return { titulo: 'Ajustes', contenido };
}
