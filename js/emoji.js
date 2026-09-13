/**
 * Elige un emoji de comida a partir del título de la receta.
 * Se usa cuando no hay foto: da variedad al recetario sin descargar nada.
 */
import { normalizar } from './units.js';

const CLAVES = [
  [/\b(pasta|espagueti|spaghetti|macarron|tallarin|lasan|carbonara|boloñe|bolone)/, '🍝'],
  [/\b(pizza|focaccia)/, '🍕'],
  [/\b(pollo|pavo|alitas|muslo|pechuga)/, '🍗'],
  [/\b(ensalada|lechuga|rucula)/, '🥗'],
  [/\b(salmon|pescado|merluza|bacalao|atun|lubina|dorada)/, '🐟'],
  [/\b(gamba|langostino|marisco|mejillon|calamar|pulpo)/, '🦐'],
  [/\b(sopa|crema|caldo|gazpacho|pure|potaje|guiso|estofado|lenteja|garbanzo|cocido)/, '🍲'],
  [/\b(arroz|risotto|paella|sushi)/, '🍚'],
  [/\b(taco|burrito|quesadilla|nacho|fajita)/, '🌮'],
  [/\b(hamburguesa|burger)/, '🍔'],
  [/\b(bocadillo|sandwich|sandwiche|tosta|montadito)/, '🥪'],
  [/\b(tortita|pancake|crepe|gofre|waffle)/, '🥞'],
  [/\b(tortilla|huevo|revuelto|frittata)/, '🍳'],
  [/\b(tarta|bizcocho|pastel|brownie|galleta|postre|mousse|flan|cheesecake)/, '🍰'],
  [/\b(pan|masa madre|brioche|bollo)/, '🥖'],
  [/\b(curry|tikka|masala|ramen|noodle|wok|pad thai|salteado)/, '🍛'],
  [/\b(batido|smoothie|zumo|bebida|cafe)/, '🥤'],
  [/\b(helado|polo)/, '🍦'],
  [/\b(carne|ternera|cerdo|costilla|solomillo|chuleta|asado)/, '🥩'],
  [/\b(patata|papa)/, '🥔'],
  [/\b(verdura|brocoli|calabacin|berenjena|vegetal|veggie)/, '🥦'],
  [/\b(queso|lasagna)/, '🧀'],
  [/\b(fruta|manzana|platano|fresa|mango)/, '🍓'],
  [/\b(avena|porridge|cereal|desayuno|yogur)/, '🥣'],
];

export function emojiDeReceta(titulo = '') {
  const n = normalizar(titulo);
  for (const [patron, emoji] of CLAVES) {
    if (patron.test(n)) return emoji;
  }
  return '🍲';
}
