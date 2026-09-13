# 🍲 Recetario

App para guardar las recetas que ves en **TikTok e Instagram**, organizar la semana
y sacar la **lista de la compra** automáticamente.

Funciona como aplicación instalable en el móvil (PWA): sin registro, sin servidor
y sin conexión. Todo se guarda en el propio dispositivo.

---

## Qué hace

| | |
|---|---|
| **📥 Recibe recetas compartidas** | Al instalarla, la app aparece en el menú *Compartir* de TikTok e Instagram. Le mandas el vídeo y se abre con el enlace listo. |
| **🪄 Lee la receta sola** | Pegas la descripción del vídeo y detecta el título, las raciones, el tiempo, los **ingredientes con sus cantidades** y los **pasos**. |
| **📖 Recetario** | Todas tus recetas con buscador por nombre *o por ingrediente*, etiquetas y favoritas. |
| **🗓️ Semana** | Colocas cada receta en su día, en la comida o en la cena. Desde ahí abres la receta para cocinar. |
| **🛒 Lista de la compra** | Suma los ingredientes de todas las recetas de la semana (250 g + 1 kg = 1,25 kg), los agrupa por secciones del súper y los puedes ir tachando. |
| **👨‍🍳 Modo cocina** | En la receta puedes tachar ingredientes y pasos según los vas haciendo, y ajustar las raciones: las cantidades se recalculan solas. |

---

## Cómo instalarla en el móvil

Primero hay que publicar la app en una dirección web (ver *Publicar* más abajo).
Después:

### Android
1. Abre la dirección en Chrome.
2. Menú **⋮ → Instalar aplicación**.
3. Listo: cuando veas una receta en TikTok o Instagram, pulsa **Compartir → Recetario**.

> **Truco:** comparte el vídeo *y además* copia su descripción (mantén pulsado el
> texto → Copiar) y pégala en el campo «Texto de la receta». Así detecta los
> ingredientes en lugar de guardar solo el enlace.

### iPhone
1. Abre la dirección en Safari.
2. **Compartir → Añadir a pantalla de inicio**.
3. iOS no permite que las webs salgan en el menú *Compartir*, así que para meter
   una receta: copia el enlace o la descripción, abre la app y pulsa **+ Receta**.

---

## Cómo se usa

1. **Guarda** la receta (compartida o pegada) y pulsa **Analizar y rellenar**.
   Revisa lo que ha detectado y corrige lo que haga falta.
2. **Planifica**: en *Semana*, pulsa «Añadir» en el día y el momento que quieras.
3. **Compra**: en *Lista*, elige la semana y ve tachando. Puedes añadir cosas
   sueltas (papel de cocina, etc.) y compartir la lista por WhatsApp.
4. **Cocina**: abre la receta desde el día que toque y sigue los pasos.

---

## Publicar

Al ser una web estática vale cualquier hosting. Con **GitHub Pages**:

1. En el repositorio: **Settings → Pages → Source: GitHub Actions**.
2. Fusiona esta rama en la rama principal. El flujo de trabajo
   `.github/workflows/deploy.yml` publica la app en cada cambio.
3. La dirección será `https://<usuario>.github.io/<repositorio>/`.

> La app **necesita HTTPS** para instalarse y para recibir recetas compartidas.
> GitHub Pages ya lo da.

Para probar en local:

```bash
python3 -m http.server 8000
# y abre http://localhost:8000
```

---

## Cómo está hecho

Sin dependencias ni compilación: HTML, CSS y JavaScript con módulos nativos.

```
index.html              Armazón de la página
manifest.webmanifest    Datos de la PWA + share_target (compartir desde otras apps)
sw.js                   Service worker: funcionamiento sin conexión
css/app.css             Estilos (claro y oscuro, móvil y escritorio)
js/
  app.js                Rutas, cabecera y navegación
  store.js              Estado y guardado en el dispositivo
  parser.js             Lee recetas de textos de redes sociales
  units.js              Unidades de cocina: convertir y sumar
  categories.js         Clasifica ingredientes por secciones del súper
  shopping.js           Construye la lista de la compra
  dates.js              Fechas y semanas
  share.js              Recibe lo compartido y detecta la plataforma
  emoji.js              Emoji de comida según el título
  ui.js                 Piezas de interfaz (botones, hojas, avisos)
  views/                Una pantalla por archivo
tools/make-icons.mjs    Genera los iconos PNG del PWA
```

### Sobre el analizador

Las descripciones de redes no tienen formato fijo, así que `parser.js` trabaja por capas:

1. Busca cabeceras explícitas (`INGREDIENTES`, `PREPARACIÓN`, `Para la salsa:`).
2. Si no las hay, clasifica línea a línea: las que empiezan por cantidad o son
   cortas van a ingredientes; las que empiezan por un verbo de cocina
   («precalienta», «cuece», «vierte») van a pasos.
3. Descarta enlaces, hashtags, menciones y reclamos («sígueme», «link en bio»).
4. De cada ingrediente separa **cantidad**, **unidad**, **nombre** y **nota**
   (`2 tomates, picados` → 2 · — · tomates · *picados*).

Nunca acierta al 100 %, por eso todo queda editable antes de guardar.

### Copias de seguridad

Los datos viven solo en el móvil. En **Ajustes** puedes descargar un archivo
`.json` con todo e importarlo en otro dispositivo.
