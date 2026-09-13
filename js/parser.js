/**
 * Analizador de recetas pegadas desde redes sociales.
 *
 * Las descripciones de TikTok/Instagram no tienen estructura, así que el
 * analizador trabaja por capas: primero busca cabeceras explícitas
 * ("INGREDIENTES", "PREPARACIÓN"); si no las hay, decide línea a línea por
 * su forma (viñetas, cantidades, verbos de cocina).
 */
import { ALIAS_UNIDADES, buscarUnidad, normalizar, parseCantidad } from './units.js';

/* ------------------------------------------------------------------ */
/* Expresiones auxiliares                                             */
/* ------------------------------------------------------------------ */

const RE_EMOJI = /[\u{1F000}-\u{1FAFF}\u{2190}-\u{21FF}\u{2300}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{2022}\u{00B7}]/gu;
const RE_VINETA = /^[\s\-–—*•·▪▫◦‣·+>»→✅✔️☑️🔸🔹⚫️⚪️🟠🟡🥄🥕🧄🧅🍅🧂]+/u;
const RE_HASHTAG = /#[\p{L}\p{N}_]+/gu;
const RE_URL = /https?:\/\/[^\s]+/gi;
const RE_ARROBA = /(?:^|\s)@[\p{L}\p{N}._]+/gu;

const CAB_INGREDIENTES = /^\W*(ingredientes?|lo que necesitas|necesitar[aá]s|necesitas|para la masa|para el relleno|para la salsa|para el alino|para el aliño|materiales)\b\W*:?\s*$/i;
const CAB_INGREDIENTES_INLINE = /^\W*(ingredientes?|lo que necesitas|necesitar[aá]s|necesitas)\b\s*:/i;
const CAB_PASOS = /^\W*(preparaci[oó]n|elaboraci[oó]n|pasos?|procedimiento|instrucciones|c[oó]mo se hace|modo de preparaci[oó]n|receta|paso a paso)\b\W*:?\s*$/i;
const CAB_PASOS_INLINE = /^\W*(preparaci[oó]n|elaboraci[oó]n|pasos?|procedimiento|instrucciones|paso a paso)\b\s*:/i;
/** Subcabeceras tipo "Para la salsa:" que dividen bloques de ingredientes. */
const SUBCABECERA = /^\W*para (el|la|los|las)\s+.{2,40}\s*:\s*$/i;

/**
 * Raíces de verbos de cocina. Trabajamos con raíces y no con infinitivos
 * porque las recetas usan imperativos con cambio vocálico ("precalienta",
 * "cuece", "vierte") que no empiezan por el infinitivo.
 */
const RAICES_COCINA = [
  'anad', 'agreg', 'mezcl', 'bat', 'cort', 'pic', 'pel', 'sofri', 'fri', 'cocin',
  'cuec', 'coce', 'coci', 'horne', 'precalient', 'precalent', 'calient', 'calent',
  'saltea', 'salte', 'remov', 'remuev', 'sirv', 'serv', 'reserv', 'dej', 'ech',
  'pon', 'salpiment', 'tritur', 'amas', 'viert', 'vert', 'escurr', 'mont', 'rellen',
  'gratin', 'marin', 'hierv', 'herv', 'tap', 'destap', 'enfri', 'refriger', 'congel',
  'desmold', 'espolvore', 'rectific', 'acompan', 'decor', 'cubr', 'troce', 'rall',
  'exprim', 'aplast', 'incorpor', 'integr', 'vuelc', 'volc', 'unt', 'pincel', 'emplat',
  'repos', 'lav', 'estir', 'extend', 'extiend', 'sazon', 'adob', 'tuest', 'tost',
  'machac', 'licu', 'rehog', 'dor', 'as', 'mech', 'glase', 'reduc', 'reduz', 'liga',
];

const CANT = String.raw`\d+\s+\d+\s*\/\s*\d+|\d+\s*\/\s*\d+|\d+\s*[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]|[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]|\d+(?:[.,]\d+)?\s*(?:-|–|a)\s*\d+(?:[.,]\d+)?|\d+(?:[.,]\d+)?`;
const RE_EMPIEZA_CANTIDAD = new RegExp(`^\\s*(?:${CANT})\\b`, 'u');

const ALIAS_ESCAPADOS = ALIAS_UNIDADES
  .map((a) => a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  .join('|');
// El lookahead evita que "4 lomos" se lea como "4 l(itros) + omos".
const RE_INGREDIENTE = new RegExp(
  `^\\s*(?<cantidad>${CANT})?\\s*(?:(?<unidad>${ALIAS_ESCAPADOS})\\.?(?![\\p{L}\\p{N}]))?\\s*(?<resto>.+)$`,
  'iu'
);

/** Reclamos de redes que nunca son ingredientes ni pasos. */
const RE_PROMO = /^\W*(sigueme|s[ií]gueme|s[ií]guenos|guarda (este|el)|guardalo|gu[aá]rdalo|comenta|comparte|dale like|link en (la )?bio|enlace en (la )?bio|receta completa en|m[aá]s recetas|suscr[ií]bete|dispon[ií]ble en|deja tu comentario|no te olvides)/i;

const RE_SIN_CANTIDAD = /\b(al gusto|a gusto|c\/n|cantidad necesaria|el que quieras|opcional|para servir|para decorar|para acompanar|para freir)\b/i;

/* ------------------------------------------------------------------ */
/* Utilidades de texto                                                */
/* ------------------------------------------------------------------ */

const quitarEmojis = (t) => t.replace(RE_EMOJI, '').replace(/\s{2,}/g, ' ').trim();

function limpiarLinea(linea) {
  return linea
    .replace(RE_VINETA, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Parece un paso: empieza por un verbo de cocina, o es una frase larga. */
function pareceInstruccion(texto) {
  const limpio = quitarEmojis(texto);
  const n = normalizar(limpio);
  if (!n) return false;
  // Una línea que abre con cantidad, o un "al gusto", es lista de la compra.
  if (RE_EMPIEZA_CANTIDAD.test(limpio) || RE_SIN_CANTIDAD.test(limpio)) return false;

  const palabras = n.split(/\s+/).filter(Boolean);
  const primera = palabras[0].replace(/[^a-z]/g, '');
  if (palabras.length >= 3 && RAICES_COCINA.some((r) => (r.length >= 4 || primera.length >= 4) && primera.startsWith(r))) {
    return true;
  }
  return palabras.length >= 9 && /[.;]/.test(n);
}

/** Parece un ingrediente: corto, con cantidad o unidad reconocible. */
function pareceIngrediente(texto) {
  const limpio = quitarEmojis(texto);
  if (!limpio) return false;
  const palabras = limpio.split(/\s+/).length;
  if (palabras > 12) return false;
  if (RE_EMPIEZA_CANTIDAD.test(limpio)) return true;
  if (RE_SIN_CANTIDAD.test(limpio)) return true;
  const primera = normalizar(limpio.split(/\s+/)[0]);
  if (buscarUnidad(primera)) return true;
  return palabras <= 5 && !/[.;:]$/.test(limpio) && !pareceInstruccion(limpio);
}

/* ------------------------------------------------------------------ */
/* Ingredientes                                                       */
/* ------------------------------------------------------------------ */

/**
 * Convierte una línea suelta en un ingrediente estructurado.
 * @param {string} linea
 * @returns {{cantidad:number|null, unidad:string|null, nombre:string, nota:string, original:string}}
 */
export function parseIngrediente(linea) {
  const original = limpiarLinea(linea);
  let texto = quitarEmojis(original).replace(/[.,;]+$/, '').trim();

  let nota = '';
  // Nota entre paréntesis: "1 cebolla (picada fina)"
  const parentesis = texto.match(/\(([^)]*)\)/);
  if (parentesis) {
    nota = parentesis[1].trim();
    texto = texto.replace(parentesis[0], ' ').replace(/\s{2,}/g, ' ').trim();
  }
  // Nota tras coma: "2 tomates, picados"
  const coma = texto.match(/^(.+?),\s*(.{2,40})$/);
  if (coma && !/\d/.test(coma[2])) {
    const posibleNota = coma[2].trim();
    if (/^(picad|cortad|ralla|trocead|lamina|pelad|en |sin |bien |muy |fresc|al gusto|opcional)/i.test(normalizar(posibleNota))) {
      nota = nota ? `${nota}, ${posibleNota}` : posibleNota;
      texto = coma[1].trim();
    }
  }
  // "al gusto" y equivalentes: se guardan como nota, no como cantidad.
  const sinCantidad = texto.match(RE_SIN_CANTIDAD);
  if (sinCantidad) {
    nota = nota ? `${nota}, ${sinCantidad[0]}` : sinCantidad[0];
    texto = texto.replace(sinCantidad[0], ' ').replace(/\s{2,}/g, ' ').replace(/\s*,\s*$/, '').trim();
  }

  const m = texto.match(RE_INGREDIENTE);
  let cantidad = null;
  let unidad = null;
  let nombre = texto;

  if (m && m.groups) {
    const posibleCantidad = m.groups.cantidad ? parseCantidad(m.groups.cantidad.trim()) : null;
    const defUnidad = m.groups.unidad ? buscarUnidad(m.groups.unidad) : null;
    let resto = (m.groups.resto || '').trim();

    // "sal" sin nada delante: la regex podría tomar "sal" como resto sin unidad.
    if (posibleCantidad != null) cantidad = posibleCantidad;
    if (defUnidad) {
      // Una unidad solo cuenta como tal si queda algo detrás ("2 tazas de arroz").
      // En "2 dientes" sin resto, el nombre sería vacío: entonces no es unidad.
      if (resto) unidad = defUnidad.id;
      else resto = m.groups.unidad;
    }
    nombre = resto;
  }

  // Quitar el "de" de enlace: "200 g de harina" → "harina"
  nombre = nombre.replace(/^(de|del|de la|de los|de las|d')\s+/i, '').trim();
  nombre = nombre.replace(/^[-–—:]\s*/, '').trim();

  // Sin unidad pero con cantidad y nombre en plural: "2 cebollas" → unidad implícita.
  if (cantidad != null && !unidad) unidad = null;

  return {
    cantidad,
    unidad,
    nombre: nombre || texto || original,
    nota,
    original,
  };
}

/**
 * Quita reclamos ("RECETA VIRAL") y suaviza los títulos en mayúsculas.
 */
function limpiarTitulo(titulo) {
  let t = titulo.replace(/^\s*(receta\s+(viral|f[aá]cil|r[aá]pida)|nueva receta|receta de|receta)\s*[:\-–—]?\s+/i, '').trim();
  if (!t) t = titulo.trim();
  const letras = t.replace(/[^\p{L}]/gu, '');
  const mayusculas = t.replace(/[^\p{Lu}]/gu, '').length;
  if (letras.length > 3 && mayusculas / letras.length > 0.7) t = t.toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/* ------------------------------------------------------------------ */
/* Receta completa                                                    */
/* ------------------------------------------------------------------ */

/**
 * Analiza el texto completo de una publicación y devuelve una receta.
 * @param {string} texto - descripción pegada desde TikTok/Instagram
 * @param {{titulo?:string, url?:string}} [pistas] - datos que ya conocemos
 */
export function parseReceta(texto, pistas = {}) {
  const bruto = String(texto || '').replace(/\r\n?/g, '\n');

  const etiquetas = [...new Set((bruto.match(RE_HASHTAG) || []).map((h) => h.slice(1).toLowerCase()))]
    .filter((t) => t.length > 2 && !/^(fyp|foryou|parati|viral|receta|recetas|reels?|tiktok|comida|food)$/i.test(t))
    .slice(0, 8);

  const urls = bruto.match(RE_URL) || [];

  const lineas = bruto
    .split('\n')
    .map((l) => l.replace(RE_URL, ' ').replace(RE_HASHTAG, ' ').replace(RE_ARROBA, ' '))
    .map((l) => l.replace(/\s{2,}/g, ' ').trimEnd())
    .map((l) => (RE_PROMO.test(limpiarLinea(quitarEmojis(l))) ? '' : l));

  // --- Localizar secciones ---
  let iIng = -1;
  let iPasos = -1;
  const cuerpo = [];
  for (let i = 0; i < lineas.length; i++) {
    const l = limpiarLinea(quitarEmojis(lineas[i]));
    if (!l) {
      cuerpo.push({ texto: '', tipo: 'vacio' });
      continue;
    }
    if (iIng === -1 && (CAB_INGREDIENTES.test(l) || CAB_INGREDIENTES_INLINE.test(l))) {
      iIng = cuerpo.length;
      // "Ingredientes: 2 huevos, 100 g de harina" trae contenido en la misma
      // línea; "INGREDIENTES" a secas no aporta nada.
      const inline = CAB_INGREDIENTES_INLINE.test(l) ? l.replace(CAB_INGREDIENTES_INLINE, '').trim() : '';
      cuerpo.push({ texto: inline, tipo: 'cab-ing' });
      continue;
    }
    if (iPasos === -1 && (CAB_PASOS.test(l) || CAB_PASOS_INLINE.test(l))) {
      iPasos = cuerpo.length;
      const inline = CAB_PASOS_INLINE.test(l) ? l.replace(CAB_PASOS_INLINE, '').trim() : '';
      cuerpo.push({ texto: inline, tipo: 'cab-pasos' });
      continue;
    }
    cuerpo.push({ texto: l, tipo: SUBCABECERA.test(l) ? 'subcab' : 'texto', original: lineas[i] });
  }

  const ingredientes = [];
  const pasos = [];
  let grupoActual = '';

  const añadirIngrediente = (linea) => {
    const ing = parseIngrediente(linea);
    if (!ing.nombre || ing.nombre.length < 2) return;
    if (grupoActual) ing.grupo = grupoActual;
    ingredientes.push(ing);
  };

  const añadirPaso = (linea) => {
    const limpio = limpiarLinea(linea).replace(/^(?:paso\s*)?\d+\s*[).:-]\s*/i, '').trim();
    if (limpio.length < 3) return;
    // Muchas descripciones meten toda la preparación en un párrafo: lo
    // partimos por frases para poder seguirlo paso a paso en la cocina.
    if (limpio.length > 140) {
      const frases = limpio.split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ¡¿])/).map((f) => f.trim()).filter((f) => f.length > 2);
      if (frases.length > 1) {
        pasos.push(...frases);
        return;
      }
    }
    pasos.push(limpio);
  };

  if (iIng !== -1) {
    // Con cabeceras: todo lo que hay entre "Ingredientes" y "Preparación".
    const fin = iPasos > iIng ? iPasos : cuerpo.length;
    if (cuerpo[iIng].texto) {
      // "Ingredientes: 2 huevos, 100 g de harina" en una sola línea.
      for (const trozo of cuerpo[iIng].texto.split(/[,;]| y (?=\d)/)) {
        if (trozo.trim()) añadirIngrediente(trozo);
      }
    }
    let vaciosSeguidos = 0;
    for (let i = iIng + 1; i < fin; i++) {
      const { texto: t, tipo } = cuerpo[i];
      if (!t) {
        vaciosSeguidos++;
        continue;
      }
      if (tipo === 'subcab') {
        grupoActual = t.replace(/:\s*$/, '').replace(/^para\s+/i, '').trim();
        vaciosSeguidos = 0;
        continue;
      }
      // Si no hay cabecera de pasos, dos líneas en blanco o una instrucción
      // clara marcan el final de la lista de ingredientes.
      if (iPasos === -1 && (vaciosSeguidos >= 2 || pareceInstruccion(t))) {
        for (let j = i; j < fin; j++) if (cuerpo[j].texto) añadirPaso(cuerpo[j].texto);
        break;
      }
      vaciosSeguidos = 0;
      añadirIngrediente(t);
    }
    if (iPasos !== -1) {
      if (cuerpo[iPasos].texto) añadirPaso(cuerpo[iPasos].texto);
      for (let i = iPasos + 1; i < cuerpo.length; i++) {
        if (cuerpo[i].texto) añadirPaso(cuerpo[i].texto);
      }
    }
  } else {
    // Sin cabeceras: clasificamos línea a línea.
    const desdePasos = iPasos !== -1 ? iPasos : Infinity;
    for (let i = 0; i < cuerpo.length; i++) {
      const { texto: t } = cuerpo[i];
      if (!t) continue;
      if (i >= desdePasos) {
        añadirPaso(t);
        continue;
      }
      if (i === 0 && !RE_EMPIEZA_CANTIDAD.test(t)) continue; // posible título
      if (pareceInstruccion(t)) añadirPaso(t);
      // Después del primer paso ya no volvemos a ingredientes salvo que la
      // línea traiga una cantidad explícita.
      else if (pasos.length && !RE_EMPIEZA_CANTIDAD.test(quitarEmojis(t))) añadirPaso(t);
      else if (pareceIngrediente(t)) añadirIngrediente(t);
      else if (pasos.length) añadirPaso(t);
    }
  }

  // --- Título ---
  let titulo = (pistas.titulo || '').trim();
  if (!titulo) {
    for (const { texto: t, tipo } of cuerpo) {
      if (!t || tipo === 'cab-ing' || tipo === 'cab-pasos') continue;
      const limpio = quitarEmojis(t).replace(/[:.!¡]+$/, '').trim();
      if (limpio.length >= 3 && limpio.length <= 70 && !RE_EMPIEZA_CANTIDAD.test(limpio) && !pareceInstruccion(limpio)) {
        titulo = limpio;
        break;
      }
    }
  }
  titulo = titulo ? limpiarTitulo(titulo) : 'Receta sin título';

  // --- Raciones y tiempo ---
  const raciones = (() => {
    const m = bruto.match(/(\d+)\s*(?:-|–|a)?\s*(\d+)?\s*(personas|raciones|porciones|comensales|servings)/i);
    if (!m) return null;
    return parseInt(m[2] || m[1], 10) || null;
  })();

  // El tiempo solo es fiable en la cabecera ("Tiempo: 40 min", "en 20 minutos"):
  // dentro de los pasos hay muchos "2 minutos por cada lado" que no son el total.
  const minutos = (() => {
    const etiquetado = bruto.match(/tiempo\s*(?:total|de preparaci[oó]n)?\s*[:=]?\s*([^\n|]{1,24})/i);
    const cabecera = lineas.slice(0, iIng !== -1 ? Math.max(1, iIng) : 3).join(' ');
    const leer = (fuente) => {
      if (!fuente) return 0;
      const horas = fuente.match(/(\d+(?:[.,]\d+)?)\s*(?:h\b|horas?)/i);
      const mins = fuente.match(/(\d+)\s*(?:min\b|minutos?|mins)/i);
      let total = 0;
      if (horas) total += parseFloat(horas[1].replace(',', '.')) * 60;
      if (mins) total += parseInt(mins[1], 10);
      return total;
    };
    const total = leer(etiquetado && etiquetado[1]) || leer(cabecera);
    return total > 0 ? Math.round(total) : null;
  })();

  return {
    titulo,
    ingredientes,
    pasos,
    etiquetas,
    raciones,
    minutos,
    url: pistas.url || urls[0] || '',
    notas: '',
  };
}
