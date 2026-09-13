/**
 * Clasifica ingredientes en secciones de supermercado para que la lista de
 * la compra siga el recorrido natural de la tienda.
 */
import { normalizar } from './units.js';

export const SECCIONES = [
  { id: 'verduras', nombre: 'Frutas y verduras', emoji: '🥬', orden: 1 },
  { id: 'carne', nombre: 'Carnicería', emoji: '🥩', orden: 2 },
  { id: 'pescado', nombre: 'Pescadería', emoji: '🐟', orden: 3 },
  { id: 'lacteos', nombre: 'Lácteos y huevos', emoji: '🥛', orden: 4 },
  { id: 'panaderia', nombre: 'Panadería', emoji: '🥖', orden: 5 },
  { id: 'despensa', nombre: 'Despensa', emoji: '🫙', orden: 6 },
  { id: 'especias', nombre: 'Especias y condimentos', emoji: '🧂', orden: 7 },
  { id: 'congelados', nombre: 'Congelados', emoji: '🧊', orden: 8 },
  { id: 'bebidas', nombre: 'Bebidas', emoji: '🧃', orden: 9 },
  { id: 'otros', nombre: 'Otros', emoji: '🛒', orden: 99 },
];

export const SECCION_POR_ID = new Map(SECCIONES.map((s) => [s.id, s]));

/**
 * Palabras clave por sección. Se buscan como palabra contenida en el nombre
 * normalizado del ingrediente; gana la coincidencia más larga, así
 * "leche de coco" cae en despensa y no en lácteos.
 */
const CLAVES = {
  verduras: [
    'cebolla', 'cebolleta', 'ajo', 'puerro', 'tomate', 'tomate cherry', 'pimiento', 'zanahoria',
    'patata', 'papa', 'boniato', 'calabacin', 'berenjena', 'calabaza', 'brocoli', 'coliflor',
    'lechuga', 'espinaca', 'rucula', 'canonigo', 'col', 'repollo', 'kale', 'apio', 'pepino',
    'champinon', 'seta', 'setas', 'esparrago', 'guisante', 'judia verde', 'maiz', 'aguacate',
    'limon', 'lima', 'naranja', 'manzana', 'platano', 'banana', 'fresa', 'frambuesa', 'arandano',
    'mango', 'pina', 'melon', 'sandia', 'pera', 'uva', 'kiwi', 'melocoton', 'granada', 'higo',
    'perejil', 'cilantro', 'albahaca', 'menta', 'hierbabuena', 'jengibre fresco', 'remolacha',
    'rabano', 'alcachofa', 'chile', 'jalapeno', 'guindilla fresca', 'brote', 'germinado', 'datil',
  ],
  carne: [
    'pollo', 'pechuga', 'muslo', 'contramuslo', 'pavo', 'ternera', 'vacuno', 'buey', 'solomillo',
    'carne picada', 'cerdo', 'lomo', 'panceta', 'bacon', 'beicon', 'chorizo', 'salchicha',
    'salchichon', 'jamon', 'jamon serrano', 'jamon cocido', 'fiambre', 'cordero', 'conejo',
    'costilla', 'chuleta', 'entrecot', 'hamburguesa', 'butifarra', 'morcilla', 'secreto', 'pato',
  ],
  pescado: [
    'salmon', 'atun fresco', 'merluza', 'bacalao', 'lubina', 'dorada', 'rape', 'lenguado',
    'sardina', 'boqueron', 'anchoa', 'trucha', 'gamba', 'langostino', 'camaron', 'mejillon',
    'almeja', 'calamar', 'chipiron', 'pulpo', 'sepia', 'vieira', 'marisco', 'pez espada', 'emperador',
  ],
  lacteos: [
    'leche', 'nata', 'crema de leche', 'yogur', 'yogurt', 'queso', 'mozzarella', 'parmesano',
    'feta', 'ricotta', 'mascarpone', 'burrata', 'cheddar', 'requeson', 'cuajada', 'kefir',
    'mantequilla', 'margarina', 'huevo', 'huevos', 'clara de huevo', 'yema', 'creme fraiche',
    'queso crema', 'skyr', 'bechamel',
  ],
  panaderia: [
    'pan', 'pan rallado', 'panko', 'baguette', 'chapata', 'bollo', 'brioche', 'tortilla de trigo',
    'tortilla de maiz', 'wrap', 'masa quebrada', 'masa de hojaldre', 'hojaldre', 'pizza base',
    'base de pizza', 'croissant', 'bizcocho', 'galleta', 'tostada', 'picos', 'obleas', 'empanada',
  ],
  despensa: [
    'arroz', 'pasta', 'espagueti', 'spaghetti', 'macarron', 'fideo', 'noodle', 'ramen', 'cuscus',
    'quinoa', 'bulgur', 'lenteja', 'garbanzo', 'alubia', 'judia blanca', 'frijol', 'harina',
    'levadura', 'azucar', 'panela', 'miel', 'sirope', 'cacao', 'chocolate', 'aceite', 'aceite de oliva',
    'vinagre', 'tomate triturado', 'tomate frito', 'passata', 'concentrado de tomate', 'conserva',
    'atun en lata', 'atun', 'maiz dulce', 'aceituna', 'alcaparra', 'encurtido', 'pepinillo',
    'caldo', 'pastilla de caldo', 'salsa de soja', 'soja', 'tahini', 'mostaza', 'ketchup', 'mayonesa',
    'salsa', 'sriracha', 'curry', 'leche de coco', 'coco rallado', 'nuez', 'almendra', 'anacardo',
    'pistacho', 'cacahuete', 'avellana', 'pipas', 'semilla', 'chia', 'avena', 'cereal', 'muesli',
    'gelatina', 'maicena', 'bicarbonato', 'tofu', 'tempeh', 'seitan', 'proteina', 'pan de molde',
    'crema de cacahuete', 'mermelada', 'pasas', 'nutricional',
  ],
  especias: [
    'sal', 'pimienta', 'comino', 'pimenton', 'paprika', 'oregano', 'tomillo', 'romero', 'laurel',
    'canela', 'nuez moscada', 'clavo', 'cardamomo', 'curcuma', 'jengibre', 'ajo en polvo',
    'cebolla en polvo', 'chili', 'cayena', 'azafran', 'vainilla', 'hierbas provenzales',
    'especias', 'condimento', 'guindilla', 'sesamo', 'zaatar', 'ras el hanout', 'garam masala',
  ],
  congelados: ['congelado', 'congelada', 'helado', 'guisantes congelados', 'verdura congelada', 'hielo'],
  bebidas: [
    'agua', 'agua con gas', 'vino', 'vino blanco', 'vino tinto', 'cerveza', 'zumo', 'jugo',
    'refresco', 'cava', 'brandy', 'ron', 'whisky', 'vodka', 'sidra', 'cafe', 'te ', 'kombucha',
    'bebida vegetal', 'bebida de avena', 'bebida de almendra', 'bebida de soja',
  ],
};

/** Índice plano ordenado por longitud descendente: gana la clave más específica. */
const INDICE = Object.entries(CLAVES)
  .flatMap(([seccion, claves]) => claves.map((clave) => ({ seccion, clave: normalizar(clave) })))
  .sort((a, b) => b.clave.length - a.clave.length);

/** Excepciones: expresiones que deben ganar siempre a la coincidencia normal. */
const EXCEPCIONES = [
  { patron: /leche de (coco|almendra|avena|soja|arroz|anacardo)/, seccion: 'despensa' },
  { patron: /queso (vegano|vegetal)/, seccion: 'despensa' },
  { patron: /\b(congelad[oa]s?)\b/, seccion: 'congelados' },
  { patron: /caldo de/, seccion: 'despensa' },
];

const CACHE_REGEX = new Map();

function regexDeClave(clave) {
  let re = CACHE_REGEX.get(clave);
  if (!re) {
    const escapada = clave.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    re = new RegExp(`(^|[^a-z0-9])${escapada}(e?s)?([^a-z0-9]|$)`);
    CACHE_REGEX.set(clave, re);
  }
  return re;
}

/**
 * Devuelve el id de sección para un nombre de ingrediente.
 * @param {string} nombre
 * @returns {string} id de sección (`otros` si no se reconoce)
 */
export function clasificar(nombre) {
  const n = normalizar(nombre);
  if (!n) return 'otros';
  for (const { patron, seccion } of EXCEPCIONES) {
    if (patron.test(n)) return seccion;
  }
  for (const { clave, seccion } of INDICE) {
    if (n === clave) return seccion;
    // Palabra completa (evita falsos positivos como "col" dentro de "coliflor"),
    // tolerando el plural: la clave "gamba" también casa con "gambas".
    if (regexDeClave(clave).test(n)) return seccion;
  }
  return 'otros';
}
