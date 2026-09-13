/**
 * Unidades de cocina: normalización, conversión y suma.
 *
 * Solo convertimos entre unidades de la misma magnitud física (peso y
 * volumen). Las cucharadas, tazas o "dientes" NO se pasan a mililitros:
 * una cucharada de harina no son 15 ml de harina, así que cada una de esas
 * unidades se acumula por separado.
 */

/** Fracciones unicode que aparecen mucho en las recetas de redes. */
export const FRACCIONES = {
  '½': 0.5, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 0.25, '¾': 0.75,
  '⅕': 0.2, '⅖': 0.4, '⅗': 0.6, '⅘': 0.8, '⅙': 1 / 6, '⅚': 5 / 6,
  '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875,
};

/**
 * Diccionario de unidades. `base` indica la magnitud: las unidades con la
 * misma `base` se suman entre sí aplicando `factor`.
 */
const UNIDADES = [
  // Peso (base: gramos)
  { id: 'g', base: 'peso', factor: 1, singular: 'g', plural: 'g', alias: ['g', 'gr', 'grs', 'gramo', 'gramos'] },
  { id: 'kg', base: 'peso', factor: 1000, singular: 'kg', plural: 'kg', alias: ['kg', 'kgs', 'kilo', 'kilos', 'kilogramo', 'kilogramos'] },
  { id: 'mg', base: 'peso', factor: 0.001, singular: 'mg', plural: 'mg', alias: ['mg', 'miligramo', 'miligramos'] },
  // Volumen (base: mililitros)
  { id: 'ml', base: 'volumen', factor: 1, singular: 'ml', plural: 'ml', alias: ['ml', 'mls', 'mililitro', 'mililitros', 'cc'] },
  { id: 'cl', base: 'volumen', factor: 10, singular: 'cl', plural: 'cl', alias: ['cl', 'centilitro', 'centilitros'] },
  { id: 'dl', base: 'volumen', factor: 100, singular: 'dl', plural: 'dl', alias: ['dl', 'decilitro', 'decilitros'] },
  { id: 'l', base: 'volumen', factor: 1000, singular: 'l', plural: 'l', alias: ['l', 'lt', 'lts', 'litro', 'litros'] },
  // Medidas de cocina (cada una es su propia magnitud)
  { id: 'cda', base: 'cda', factor: 1, singular: 'cda', plural: 'cdas', alias: ['cda', 'cdas', 'cs', 'cucharada', 'cucharadas', 'cucharada sopera', 'cucharadas soperas'] },
  { id: 'cdta', base: 'cdta', factor: 1, singular: 'cdta', plural: 'cdtas', alias: ['cdta', 'cdtas', 'cp', 'cucharadita', 'cucharaditas', 'cucharilla', 'cucharillas'] },
  { id: 'taza', base: 'taza', factor: 1, singular: 'taza', plural: 'tazas', alias: ['taza', 'tazas', 'cup', 'cups'] },
  { id: 'vaso', base: 'vaso', factor: 1, singular: 'vaso', plural: 'vasos', alias: ['vaso', 'vasos'] },
  { id: 'pizca', base: 'pizca', factor: 1, singular: 'pizca', plural: 'pizcas', alias: ['pizca', 'pizcas'] },
  { id: 'punado', base: 'punado', factor: 1, singular: 'puñado', plural: 'puñados', alias: ['punado', 'punados', 'punadito'] },
  { id: 'chorrito', base: 'chorrito', factor: 1, singular: 'chorrito', plural: 'chorritos', alias: ['chorrito', 'chorritos', 'chorro', 'chorros'] },
  // Formatos de compra
  { id: 'unidad', base: 'unidad', factor: 1, singular: 'ud', plural: 'uds', alias: ['ud', 'uds', 'u', 'unidad', 'unidades', 'pieza', 'piezas'] },
  { id: 'diente', base: 'diente', factor: 1, singular: 'diente', plural: 'dientes', alias: ['diente', 'dientes'] },
  { id: 'lata', base: 'lata', factor: 1, singular: 'lata', plural: 'latas', alias: ['lata', 'latas', 'bote', 'botes'] },
  { id: 'paquete', base: 'paquete', factor: 1, singular: 'paquete', plural: 'paquetes', alias: ['paquete', 'paquetes', 'pack', 'packs'] },
  { id: 'sobre', base: 'sobre', factor: 1, singular: 'sobre', plural: 'sobres', alias: ['sobre', 'sobres'] },
  { id: 'rodaja', base: 'rodaja', factor: 1, singular: 'rodaja', plural: 'rodajas', alias: ['rodaja', 'rodajas', 'loncha', 'lonchas', 'rebanada', 'rebanadas'] },
  { id: 'rama', base: 'rama', factor: 1, singular: 'rama', plural: 'ramas', alias: ['rama', 'ramas', 'ramita', 'ramitas', 'ramillete'] },
  { id: 'hoja', base: 'hoja', factor: 1, singular: 'hoja', plural: 'hojas', alias: ['hoja', 'hojas'] },
  { id: 'manojo', base: 'manojo', factor: 1, singular: 'manojo', plural: 'manojos', alias: ['manojo', 'manojos', 'atado', 'atados'] },
  { id: 'botella', base: 'botella', factor: 1, singular: 'botella', plural: 'botellas', alias: ['botella', 'botellas', 'brick', 'bricks'] },
];

const POR_ALIAS = new Map();
for (const u of UNIDADES) {
  for (const a of u.alias) POR_ALIAS.set(a, u);
  POR_ALIAS.set(u.id, u);
}

/** Quita tildes y pasa a minúsculas, para comparar de forma tolerante. */
export function normalizar(texto) {
  return (texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/** Devuelve la definición de unidad para un texto libre, o null. */
export function buscarUnidad(texto) {
  if (!texto) return null;
  const limpio = normalizar(texto).replace(/\.$/, '').replace(/\s+/g, ' ');
  return POR_ALIAS.get(limpio) || null;
}

/** Lista de alias ordenada de más larga a más corta (para el analizador). */
export const ALIAS_UNIDADES = [...POR_ALIAS.keys()].sort((a, b) => b.length - a.length);

/** Convierte "1 1/2", "½", "1,5" o "2-3" en un número. En los rangos toma el mayor. */
export function parseCantidad(texto) {
  if (texto == null) return null;
  let t = String(texto).trim();
  if (!t) return null;

  // Rango: "2-3 cebollas" → nos quedamos con el máximo para no quedarnos cortos.
  const rango = t.match(/^(\d+(?:[.,]\d+)?)\s*(?:-|–|a)\s*(\d+(?:[.,]\d+)?)$/);
  if (rango) return Math.max(parseFloat(rango[1].replace(',', '.')), parseFloat(rango[2].replace(',', '.')));

  let total = 0;
  let encontrado = false;

  // Parte entera + fracción unicode pegada: "1½"
  const mixtaUni = t.match(/^(\d+)\s*([½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])$/);
  if (mixtaUni) return parseInt(mixtaUni[1], 10) + FRACCIONES[mixtaUni[2]];

  // Fracción unicode sola
  if (FRACCIONES[t]) return FRACCIONES[t];

  // "1 1/2" o "1/2"
  const mixta = t.match(/^(?:(\d+)\s+)?(\d+)\s*\/\s*(\d+)$/);
  if (mixta) {
    const entero = mixta[1] ? parseInt(mixta[1], 10) : 0;
    const den = parseInt(mixta[3], 10);
    if (!den) return null;
    return entero + parseInt(mixta[2], 10) / den;
  }

  // Decimal con coma o punto
  const num = t.match(/^(\d+(?:[.,]\d+)?)$/);
  if (num) {
    total = parseFloat(num[1].replace(',', '.'));
    encontrado = true;
  }
  return encontrado && Number.isFinite(total) ? total : null;
}

/** Formatea un número de forma legible: 1.5 → "1,5"; 2 → "2"; 0.25 → "¼". */
export function formatearCantidad(n) {
  if (n == null || !Number.isFinite(n)) return '';
  const redondeado = Math.round(n * 100) / 100;
  if (Number.isInteger(redondeado)) return String(redondeado);
  const entero = Math.floor(redondeado);
  const resto = Math.round((redondeado - entero) * 1000) / 1000;
  const simbolo = { 0.5: '½', 0.25: '¼', 0.75: '¾', 0.333: '⅓', 0.667: '⅔' }[resto];
  if (simbolo) return entero ? `${entero}${simbolo}` : simbolo;
  return String(redondeado).replace('.', ',');
}

/**
 * Suma una lista de medidas `{cantidad, unidad}` del mismo ingrediente.
 * Devuelve un array de trozos `{cantidad, unidad, texto}`: uno por cada
 * magnitud que no se puede mezclar con las demás.
 */
export function sumarMedidas(medidas) {
  const porBase = new Map();
  let sinCantidad = false;

  for (const m of medidas) {
    const unidad = m.unidad ? buscarUnidad(m.unidad) : null;
    if (m.cantidad == null) {
      // "sal al gusto": no aporta cantidad, pero el ingrediente debe aparecer.
      if (!m.unidad) sinCantidad = true;
      continue;
    }
    const base = unidad ? unidad.base : 'unidad';
    const factor = unidad ? unidad.factor : 1;
    const previo = porBase.get(base) || { total: 0, unidad };
    previo.total += m.cantidad * factor;
    // Nos quedamos con la unidad más pequeña vista para no perder precisión.
    if (unidad && (!previo.unidad || unidad.factor < previo.unidad.factor)) previo.unidad = unidad;
    porBase.set(base, previo);
  }

  const trozos = [];
  for (const [base, { total, unidad }] of porBase) {
    let cantidad = total;
    let u = unidad;
    if (base === 'peso') {
      u = total >= 1000 ? buscarUnidad('kg') : buscarUnidad('g');
      cantidad = total / u.factor;
    } else if (base === 'volumen') {
      u = total >= 1000 ? buscarUnidad('l') : buscarUnidad('ml');
      cantidad = total / u.factor;
    } else if (u) {
      cantidad = total / u.factor;
    }
    const etiqueta = u ? (cantidad === 1 ? u.singular : u.plural) : '';
    const esSimbolo = u && ['g', 'kg', 'mg', 'ml', 'cl', 'dl', 'l'].includes(u.id);
    trozos.push({
      cantidad,
      unidad: u ? u.id : null,
      texto: [formatearCantidad(cantidad), esSimbolo ? etiqueta : etiqueta && ` ${etiqueta}`.trim()]
        .filter(Boolean)
        .join(esSimbolo ? ' ' : ' '),
    });
  }

  if (!trozos.length && sinCantidad) return [{ cantidad: null, unidad: null, texto: '' }];
  return trozos;
}
