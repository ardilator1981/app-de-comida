/**
 * Copias de seguridad y recordatorio.
 *
 * Las recetas solo viven en el navegador, así que se pueden perder al limpiar
 * datos o al cambiar de móvil. Aquí se descarga la copia y se decide cuándo
 * conviene recordarlo, sin dar la lata: solo si hay algo que merezca la pena
 * proteger y solo cada cierto tiempo.
 */
import { actualizar, exportar, obtener } from './store.js';

const DIA = 24 * 60 * 60 * 1000;
/** Cada cuánto se recuerda hacer copia. */
export const DIAS_ENTRE_COPIAS = 30;
/** Cuánto se calla el aviso al pulsar "Ahora no". */
const DIAS_POSPUESTO = 7;
/** Por debajo de esto no molestamos: hay poco que perder. */
const RECETAS_MINIMAS = 3;

const diasDesde = (marca) => Math.floor((Date.now() - marca) / DIA);

/**
 * Estado de la copia de seguridad.
 * @returns {{nunca:boolean, dias:number|null, tocaAvisar:boolean}}
 *   `dias` son los días desde la última copia, o desde la receta más antigua
 *   si todavía no se ha hecho ninguna.
 */
export function estadoCopia() {
  const { recetas, ajustes } = obtener();
  const ultima = ajustes.ultimaCopia || 0;
  const nunca = !ultima;

  let dias = null;
  if (ultima) {
    dias = diasDesde(ultima);
  } else if (recetas.length) {
    const masAntigua = Math.min(...recetas.map((r) => r.creada || Date.now()));
    dias = diasDesde(masAntigua);
  }

  const pospuesto = ajustes.avisoCopiaPospuesto || 0;
  const enSilencio = pospuesto && diasDesde(pospuesto) < DIAS_POSPUESTO;

  const tocaAvisar =
    recetas.length >= RECETAS_MINIMAS &&
    !enSilencio &&
    dias != null &&
    dias >= DIAS_ENTRE_COPIAS;

  return { nunca, dias, tocaAvisar };
}

/** Descarga un archivo .json con todo el recetario y anota la fecha. */
export function descargarCopia() {
  // Se anota la fecha ANTES de exportar para que el propio archivo la lleve
  // dentro: si algún día se restaura, no pedirá copia nada más abrirlo.
  actualizar((s) => {
    s.ajustes.ultimaCopia = Date.now();
    s.ajustes.avisoCopiaPospuesto = 0;
  }, 'ajustes');

  const blob = new Blob([exportar()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const fecha = new Date().toISOString().slice(0, 10);

  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = `recetario-${fecha}.json`;
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Silencia el recordatorio una temporada. */
export function posponerAviso() {
  actualizar((s) => {
    s.ajustes.avisoCopiaPospuesto = Date.now();
  }, 'ajustes');
}

/** Texto para Ajustes: "Última copia hace 3 días". */
export function resumenCopia() {
  const { nunca, dias } = estadoCopia();
  if (nunca) return 'Todavía no has descargado ninguna copia';
  if (dias === 0) return 'Última copia: hoy';
  if (dias === 1) return 'Última copia: ayer';
  return `Última copia: hace ${dias} días`;
}
