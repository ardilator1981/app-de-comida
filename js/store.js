/**
 * Estado de la aplicación y persistencia.
 *
 * Todo vive en el móvil (localStorage): no hay servidor, no hay cuentas y
 * funciona sin conexión. El estado se publica con un patrón de suscripción
 * para que las vistas se redibujen solas.
 */

const CLAVE = 'recetario.v1';
const VERSION = 1;

/** @typedef {{cantidad:number|null, unidad:string|null, nombre:string, nota?:string, grupo?:string, original?:string}} Ingrediente */
/** @typedef {{id:string, titulo:string, ingredientes:Ingrediente[], pasos:string[], etiquetas:string[], raciones:number|null, minutos:number|null, url:string, imagen:string, fuente:string, notas:string, favorita:boolean, creada:number, editada:number}} Receta */
/** @typedef {{id:string, fecha:string, momento:'comida'|'cena', recetaId:string, raciones:number|null}} Comida */

const estadoInicial = () => ({
  version: VERSION,
  recetas: /** @type {Receta[]} */ ([]),
  semana: /** @type {Comida[]} */ ([]),
  lista: {
    extras: /** @type {{id:string, texto:string, seccion:string, hecho:boolean}[]} */ ([]),
    hechos: /** @type {Record<string, boolean>} */ ({}),
    /** Rango que se está comprando: 'actual', 'proxima' o 'todo'. */
    rango: 'actual',
  },
  ajustes: {
    mostrarBienvenida: true,
  },
});

let estado = estadoInicial();
const oyentes = new Set();

/** Identificador corto y único para recetas, comidas y extras. */
export function nuevoId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function leerDisco() {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (!crudo) return estadoInicial();
    const datos = JSON.parse(crudo);
    return migrar(datos);
  } catch (error) {
    console.warn('No se pudo leer el almacenamiento, empiezo de cero', error);
    return estadoInicial();
  }
}

/** Completa los campos que falten al abrir datos de versiones anteriores. */
function migrar(datos) {
  const base = estadoInicial();
  const fusion = {
    ...base,
    ...datos,
    lista: { ...base.lista, ...(datos.lista || {}) },
    ajustes: { ...base.ajustes, ...(datos.ajustes || {}) },
  };
  fusion.recetas = (fusion.recetas || []).map((r) => ({
    ...r,
    ingredientes: r.ingredientes || [],
    pasos: r.pasos || [],
    etiquetas: r.etiquetas || [],
    favorita: Boolean(r.favorita),
  }));
  fusion.semana = (fusion.semana || []).filter((c) => c && c.fecha && c.recetaId);
  fusion.version = VERSION;
  return fusion;
}

let pendiente = null;
function guardarDisco() {
  // Agrupamos las escrituras: escribir en cada pulsación de tecla va lento.
  if (pendiente) clearTimeout(pendiente);
  pendiente = setTimeout(() => {
    pendiente = null;
    try {
      localStorage.setItem(CLAVE, JSON.stringify(estado));
    } catch (error) {
      console.error('No se pudo guardar', error);
      avisar('error-guardado');
    }
  }, 120);
}

function avisar(motivo) {
  for (const fn of oyentes) fn(estado, motivo);
}

/* ------------------------------------------------------------------ */
/* API pública                                                        */
/* ------------------------------------------------------------------ */

export function cargar() {
  estado = leerDisco();
  return estado;
}

export const obtener = () => estado;

/** Se suscribe a los cambios. Devuelve la función para darse de baja. */
export function suscribir(fn) {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}

/**
 * Aplica un cambio sobre el estado, guarda y avisa a las vistas.
 * @param {(borrador: typeof estado) => void} cambio
 */
export function actualizar(cambio, motivo = 'cambio') {
  cambio(estado);
  guardarDisco();
  avisar(motivo);
}

/* --- Recetas --- */

export function guardarReceta(datos) {
  const ahora = Date.now();
  let id = datos.id;
  actualizar((s) => {
    const indice = id ? s.recetas.findIndex((r) => r.id === id) : -1;
    if (indice >= 0) {
      s.recetas[indice] = { ...s.recetas[indice], ...datos, editada: ahora };
    } else {
      id = datos.id || nuevoId();
      s.recetas.unshift({
        favorita: false,
        imagen: '',
        fuente: '',
        notas: '',
        etiquetas: [],
        raciones: null,
        minutos: null,
        url: '',
        ...datos,
        id,
        creada: ahora,
        editada: ahora,
      });
    }
  }, 'recetas');
  return id;
}

export function borrarReceta(id) {
  actualizar((s) => {
    s.recetas = s.recetas.filter((r) => r.id !== id);
    s.semana = s.semana.filter((c) => c.recetaId !== id);
  }, 'recetas');
}

export const recetaPorId = (id) => estado.recetas.find((r) => r.id === id) || null;

export function alternarFavorita(id) {
  actualizar((s) => {
    const r = s.recetas.find((x) => x.id === id);
    if (r) r.favorita = !r.favorita;
  }, 'recetas');
}

/* --- Planificador semanal --- */

export function planificar({ fecha, momento, recetaId, raciones = null }) {
  const id = nuevoId();
  actualizar((s) => {
    s.semana.push({ id, fecha, momento, recetaId, raciones });
  }, 'semana');
  return id;
}

export function quitarComida(id) {
  actualizar((s) => {
    s.semana = s.semana.filter((c) => c.id !== id);
  }, 'semana');
}

export function moverComida(id, fecha, momento) {
  actualizar((s) => {
    const c = s.semana.find((x) => x.id === id);
    if (c) {
      c.fecha = fecha;
      c.momento = momento;
    }
  }, 'semana');
}

export const comidasDe = (fecha) => estado.semana.filter((c) => c.fecha === fecha);

/* --- Lista de la compra --- */

export function marcarArticulo(clave, hecho) {
  actualizar((s) => {
    if (hecho) s.lista.hechos[clave] = true;
    else delete s.lista.hechos[clave];
  }, 'lista');
}

export function añadirExtra(texto, seccion = 'otros') {
  actualizar((s) => {
    s.lista.extras.push({ id: nuevoId(), texto, seccion, hecho: false });
  }, 'lista');
}

export function alternarExtra(id) {
  actualizar((s) => {
    const e = s.lista.extras.find((x) => x.id === id);
    if (e) e.hecho = !e.hecho;
  }, 'lista');
}

export function quitarExtra(id) {
  actualizar((s) => {
    s.lista.extras = s.lista.extras.filter((e) => e.id !== id);
  }, 'lista');
}

export function limpiarMarcados() {
  actualizar((s) => {
    s.lista.hechos = {};
    s.lista.extras = s.lista.extras.filter((e) => !e.hecho);
  }, 'lista');
}

export function fijarRango(rango) {
  actualizar((s) => {
    s.lista.rango = rango;
  }, 'lista');
}

/* --- Copia de seguridad --- */

export function exportar() {
  return JSON.stringify({ ...estado, exportado: new Date().toISOString() }, null, 2);
}

/**
 * Importa una copia. `modo` 'fusionar' conserva lo que ya hay.
 * @returns {{recetas:number}} resumen de lo importado
 */
export function importar(json, modo = 'fusionar') {
  const datos = migrar(JSON.parse(json));
  let añadidas = 0;
  actualizar((s) => {
    if (modo === 'reemplazar') {
      Object.assign(s, datos);
      añadidas = datos.recetas.length;
      return;
    }
    const existentes = new Set(s.recetas.map((r) => r.id));
    for (const receta of datos.recetas) {
      if (existentes.has(receta.id)) continue;
      s.recetas.push(receta);
      añadidas++;
    }
    const idsComida = new Set(s.semana.map((c) => c.id));
    for (const comida of datos.semana) {
      if (!idsComida.has(comida.id)) s.semana.push(comida);
    }
  }, 'importar');
  return { recetas: añadidas };
}

export function borrarTodo() {
  actualizar((s) => Object.assign(s, estadoInicial()), 'reset');
}
