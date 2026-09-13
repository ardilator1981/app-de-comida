/**
 * Construye la lista de la compra a partir de las comidas planificadas.
 *
 * Junta el mismo ingrediente aunque venga de recetas distintas, suma las
 * cantidades compatibles y lo ordena por secciones del supermercado.
 */
import { clasificar, SECCIONES } from './categories.js';
import { normalizar, sumarMedidas } from './units.js';

/** Palabras que no distinguen un ingrediente de otro al agruparlos. */
const RUIDO = /\b(fresc[oa]s?|natural(es)?|grande?s?|pequen[oa]s?|median[oa]s?|al gusto|opcional|picad[oa]s?|ralla[dn][oa]s?|trocead[oa]s?|cortad[oa]s?|en rodajas|en dados|en tiras|lamina[dn][oa]s?|pelad[oa]s?|sin piel|sin hueso|extra virgen|virgen extra|de calidad|bien )\b/g;

/**
 * Clave de agrupación: minúsculas, sin tildes, sin adjetivos de corte y en
 * singular, para que "2 Cebollas grandes" y "1 cebolla" acaben en la misma fila.
 */
export function claveIngrediente(nombre) {
  let n = normalizar(nombre)
    .replace(/\(.*?\)/g, ' ')
    .replace(RUIDO, ' ')
    .replace(/[^a-z0-9ñ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  n = n
    .split(' ')
    .map((p) => (p.length > 4 && /(es|s)$/.test(p) ? p.replace(/(es|s)$/, '') : p))
    .join(' ');
  return n.trim();
}

/** Deja el nombre presentable: "Pechuga de pollo". */
function nombreBonito(nombre) {
  // Cómo se corta el ingrediente es cosa de la cocina, no del supermercado.
  const limpio = nombre
    .replace(/,?\s*\b(picad|rallad|trocead|cortad|laminad|machacad)[oa]s?\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!limpio) return limpio;
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

/**
 * @param {object} opciones
 * @param {import('./store.js').Receta[]} opciones.recetas
 * @param {import('./store.js').Comida[]} opciones.comidas - ya filtradas por fecha
 * @param {{id:string, texto:string, seccion:string, hecho:boolean}[]} [opciones.extras]
 * @param {Record<string, boolean>} [opciones.hechos]
 * @returns {{secciones: Array, total:number, hechos:number}}
 */
export function generarLista({ recetas, comidas, extras = [], hechos = {} }) {
  const porReceta = new Map(recetas.map((r) => [r.id, r]));
  /** @type {Map<string, {clave:string, nombre:string, medidas:any[], notas:Set<string>, recetas:Map<string,string>}>} */
  const acumulado = new Map();

  for (const comida of comidas) {
    const receta = porReceta.get(comida.recetaId);
    if (!receta) continue;
    // Si la comida pide más raciones que la receta original, escalamos.
    const factor =
      comida.raciones && receta.raciones ? comida.raciones / receta.raciones : 1;

    for (const ing of receta.ingredientes || []) {
      const clave = claveIngrediente(ing.nombre);
      if (!clave) continue;
      let fila = acumulado.get(clave);
      if (!fila) {
        fila = { clave, nombre: ing.nombre, medidas: [], notas: new Set(), recetas: new Map() };
        acumulado.set(clave, fila);
      }
      // Nos quedamos con el nombre más descriptivo que hayamos visto.
      if (ing.nombre.length > fila.nombre.length) fila.nombre = ing.nombre;
      fila.medidas.push({
        cantidad: ing.cantidad == null ? null : ing.cantidad * factor,
        unidad: ing.unidad,
      });
      if (ing.nota) fila.notas.add(ing.nota);
      fila.recetas.set(receta.id, receta.titulo);
    }
  }

  /** @type {Map<string, any[]>} */
  const porSeccion = new Map();
  const meter = (seccionId, articulo) => {
    if (!porSeccion.has(seccionId)) porSeccion.set(seccionId, []);
    porSeccion.get(seccionId).push(articulo);
  };

  let total = 0;
  let marcados = 0;

  for (const fila of acumulado.values()) {
    const trozos = sumarMedidas(fila.medidas);
    const cantidadTexto = trozos.map((t) => t.texto).filter(Boolean).join(' + ');
    const hecho = Boolean(hechos[fila.clave]);
    total++;
    if (hecho) marcados++;
    meter(clasificar(fila.nombre), {
      tipo: 'ingrediente',
      clave: fila.clave,
      nombre: nombreBonito(fila.nombre),
      cantidad: cantidadTexto,
      notas: [...fila.notas],
      recetas: [...fila.recetas.values()],
      hecho,
    });
  }

  for (const extra of extras) {
    total++;
    if (extra.hecho) marcados++;
    meter(extra.seccion || 'otros', {
      tipo: 'extra',
      clave: extra.id,
      nombre: nombreBonito(extra.texto),
      cantidad: '',
      notas: [],
      recetas: [],
      hecho: extra.hecho,
    });
  }

  const secciones = SECCIONES.filter((s) => porSeccion.has(s.id))
    .sort((a, b) => a.orden - b.orden)
    .map((s) => ({
      ...s,
      articulos: porSeccion.get(s.id).sort((a, b) => {
        if (a.hecho !== b.hecho) return a.hecho ? 1 : -1;
        return a.nombre.localeCompare(b.nombre, 'es');
      }),
    }));

  return { secciones, total, hechos: marcados };
}

/** Versión en texto plano de la lista, para compartir o copiar. */
export function listaComoTexto({ secciones }, titulo = 'Lista de la compra') {
  const lineas = [titulo, ''];
  for (const seccion of secciones) {
    lineas.push(`${seccion.emoji} ${seccion.nombre.toUpperCase()}`);
    for (const a of seccion.articulos) {
      const marca = a.hecho ? '[x]' : '[ ]';
      lineas.push(`${marca} ${a.cantidad ? `${a.cantidad} ` : ''}${a.nombre}`);
    }
    lineas.push('');
  }
  return lineas.join('\n').trim();
}
