/**
 * Entrada de recetas compartidas desde otras apps.
 *
 * En Android, al instalar la app, el sistema la ofrece en el menú
 * "Compartir" de TikTok/Instagram gracias a `share_target` del manifiesto.
 * La app se abre con los datos en la URL y aquí los recogemos.
 */

const PLATAFORMAS = [
  { id: 'tiktok', nombre: 'TikTok', emoji: '🎵', patron: /tiktok\.com/i },
  { id: 'instagram', nombre: 'Instagram', emoji: '📸', patron: /instagram\.com/i },
  { id: 'youtube', nombre: 'YouTube', emoji: '▶️', patron: /(youtube\.com|youtu\.be)/i },
  { id: 'pinterest', nombre: 'Pinterest', emoji: '📌', patron: /pinterest\./i },
  { id: 'facebook', nombre: 'Facebook', emoji: '👍', patron: /facebook\.com|fb\.watch/i },
  { id: 'threads', nombre: 'Threads', emoji: '🧵', patron: /threads\.net/i },
  { id: 'x', nombre: 'X', emoji: '𝕏', patron: /(twitter\.com|x\.com)/i },
  { id: 'whatsapp', nombre: 'WhatsApp', emoji: '💬', patron: /wa\.me|whatsapp\.com/i },
];

/** Identifica de dónde viene un enlace. */
export function detectarPlataforma(url) {
  if (!url) return null;
  return PLATAFORMAS.find((p) => p.patron.test(url)) || { id: 'web', nombre: 'Web', emoji: '🔗' };
}

/** Primer enlace que aparece en un texto. */
export function extraerUrl(texto) {
  const m = String(texto || '').match(/https?:\/\/[^\s]+/i);
  return m ? m[0].replace(/[),.]+$/, '') : '';
}

/**
 * Lee los datos que llegan de una compartición y limpia la barra de
 * direcciones para que al recargar no se repita el alta.
 * @returns {{titulo:string, texto:string, url:string}|null}
 */
export function recogerCompartido() {
  const params = new URLSearchParams(location.search);
  const titulo = params.get('title') || params.get('share_title') || '';
  const texto = params.get('text') || params.get('share_text') || '';
  let url = params.get('url') || params.get('share_url') || '';

  if (!titulo && !texto && !url) return null;

  // Muchas apps meten el enlace dentro del texto en lugar de en `url`.
  if (!url) url = extraerUrl(texto) || extraerUrl(titulo);

  history.replaceState(null, '', location.pathname + location.hash);
  return { titulo: titulo.trim(), texto: texto.trim(), url: url.trim() };
}

/**
 * Plataformas que publican un oEmbed abierto del que se puede sacar la
 * descripción del vídeo. Instagram exige credenciales de empresa y Facebook
 * no lo ofrece, así que de esas solo se guarda el enlace.
 */
export const PLATAFORMAS_LEIBLES = ['tiktok', 'youtube'];

/**
 * Intenta recuperar título y miniatura del enlace mediante oEmbed público.
 * Es un extra: si la red o CORS lo impiden, la app sigue funcionando igual.
 * @param {string} url
 * @returns {Promise<{titulo?:string, autor?:string, imagen?:string}|null>}
 */
export async function pedirMetadatos(url) {
  const plataforma = detectarPlataforma(url);
  let peticion = null;
  if (plataforma?.id === 'tiktok') {
    peticion = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
  } else if (plataforma?.id === 'youtube') {
    peticion = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`;
  }
  if (!peticion) return null;

  const corte = new AbortController();
  const temporizador = setTimeout(() => corte.abort(), 6000);
  try {
    const respuesta = await fetch(peticion, { signal: corte.signal });
    if (!respuesta.ok) return null;
    const datos = await respuesta.json();
    return {
      titulo: datos.title || '',
      autor: datos.author_name || '',
      imagen: datos.thumbnail_url || '',
    };
  } catch {
    return null; // Sin conexión o bloqueado por el navegador: seguimos a mano.
  } finally {
    clearTimeout(temporizador);
  }
}

/** Comparte con el sistema si se puede; si no, copia al portapapeles. */
export async function compartirTexto(texto, titulo = 'Lista de la compra') {
  if (navigator.share) {
    try {
      await navigator.share({ title: titulo, text: texto });
      return 'compartido';
    } catch (error) {
      if (error?.name === 'AbortError') return 'cancelado';
    }
  }
  try {
    await navigator.clipboard.writeText(texto);
    return 'copiado';
  } catch {
    return 'error';
  }
}
