# 🍲 Recetario

App para guardar recetas de internet, organizar la semana y sacar la
**lista de la compra** automáticamente.

Funciona como aplicación instalable en el móvil (PWA): sin registro, sin servidor
y sin conexión. Todo se guarda en el propio dispositivo.

---

## Qué hace

| | |
|---|---|
| **📥 Recibe recetas compartidas** | Al instalarla, aparece en el menú *Compartir* del móvil. Selecciona la receta en cualquier web, compártela con la app y se rellena sola. |
| **🪄 Lee la receta sola** | Detecta el título, las raciones, el tiempo, los **ingredientes con sus cantidades**, los **pasos** y las notas, y descarta valoraciones, botones y tablas nutricionales. |
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

1. Abre <https://github.com/ardilator1981/app-de-comida/settings/pages>
   (es la pestaña **Settings** del repositorio en github.com, y dentro
   **Pages** en la columna de la izquierda).
2. En **Source**, elige **GitHub Actions**.
3. Ya está. El flujo `.github/workflows/deploy.yml` publica la app en cada
   cambio que se suba a la rama principal.
4. La dirección será `https://ardilator1981.github.io/app-de-comida/`.

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

### De dónde salen las recetas

**Webs y blogs de recetas** son la mejor fuente: puedes seleccionar el texto
y compartirlo con la app, y el analizador entiende las fichas de receta que
usan casi todos los blogs.

**TikTok e Instagram no dejan leer su contenido desde una web.** Es una regla
de seguridad de los navegadores: una página solo puede leer datos de otro
sitio si ese sitio da permiso, y ellos no lo dan. Las apps que sí lo
consiguen tienen un servidor propio que descarga la página —un servidor no
está sujeto a esa regla—, y las mejores además transcriben el audio del
vídeo. Aquí la app intenta pedir la descripción a TikTok por su oEmbed
público, pero lo normal es que no llegue; en ese caso se guarda el enlace y
los ingredientes se escriben a mano.

### Sobre el analizador

Las recetas de internet no tienen formato fijo, así que `parser.js` trabaja por capas:

1. Busca cabeceras explícitas (`INGREDIENTES`, `PREPARACIÓN`, `Para la salsa:`).
2. Si no las hay, clasifica línea a línea: las que empiezan por cantidad o son
   cortas van a ingredientes; las que empiezan por un verbo de cocina
   («precalienta», «cuece», «vierte») van a pasos.
3. Descarta enlaces, hashtags, menciones, reclamos («sígueme», «link en bio»)
   y el envoltorio de los blogs: valoraciones, botones de imprimir, tablas
   nutricionales y todo lo que viene después de la receta.
4. Separa las secciones de «Notas» o «Consejos» y las guarda como notas.
5. De cada ingrediente separa **cantidad**, **unidad**, **nombre** y **nota**
   (`2 tomates, picados` → 2 · — · tomates · *picados*).

Nunca acierta al 100 %, por eso todo queda editable antes de guardar.

### Copias de seguridad

Los datos viven solo en el móvil, así que se pierden si se borran los datos
del navegador o si cambias de teléfono. En **Ajustes** puedes descargar un
archivo `.json` con todo e importarlo en otro dispositivo.

La app lo recuerda sola: si han pasado más de 30 días desde la última copia
(y hay al menos 3 recetas que perder), aparece un aviso en el recetario.
Con «Ahora no» se calla una semana.
