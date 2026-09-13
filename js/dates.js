/** Utilidades de fechas para el planificador. La semana empieza en lunes. */

export const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const DIAS_CORTOS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** Fecha local en formato YYYY-MM-DD (sin saltos por zona horaria). */
export function aISO(fecha) {
  const d = new Date(fecha);
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

export function deISO(iso) {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d);
}

export const hoyISO = () => aISO(new Date());

export function sumarDias(iso, dias) {
  const d = deISO(iso);
  d.setDate(d.getDate() + dias);
  return aISO(d);
}

/** Lunes de la semana a la que pertenece la fecha. */
export function lunesDe(iso) {
  const d = deISO(iso);
  const dia = (d.getDay() + 6) % 7; // 0 = lunes
  d.setDate(d.getDate() - dia);
  return aISO(d);
}

/** Los siete días (ISO) de la semana que empieza en `lunes`. */
export const semanaDesde = (lunes) => Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));

/** Índice 0-6 del día de la semana (0 = lunes). */
export const indiceDia = (iso) => (deISO(iso).getDay() + 6) % 7;

/** "12 de marzo" */
export function formatoLargo(iso) {
  const d = deISO(iso);
  return `${d.getDate()} de ${MESES[d.getMonth()]}`;
}

/** "12 mar" */
export function formatoCorto(iso) {
  const d = deISO(iso);
  return `${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)}`;
}

/** "Semana del 10 al 16 de marzo" */
export function rotuloSemana(lunes) {
  const domingo = sumarDias(lunes, 6);
  const a = deISO(lunes);
  const b = deISO(domingo);
  if (a.getMonth() === b.getMonth()) {
    return `${a.getDate()} – ${b.getDate()} de ${MESES[b.getMonth()]}`;
  }
  return `${a.getDate()} ${MESES[a.getMonth()].slice(0, 3)} – ${b.getDate()} ${MESES[b.getMonth()].slice(0, 3)}`;
}

export const esHoy = (iso) => iso === hoyISO();
