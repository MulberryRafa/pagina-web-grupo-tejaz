# Grupo Tejaz

Sitio estático: `index.html` es la portada y `proyectos.html` contiene el archivo y sus galerías. Se pueden abrir directamente en el navegador; no necesitan instalar paquetes ni un servidor para cargar los datos de proyectos. Las tipografías de Google necesitan conexión.

## Estructura

```
index.html          Portada
proyectos.html       Archivo de proyectos y galerías
projects.json        Fuente de datos de proyectos (editar aquí)
package.json         Scripts de build/check (npm run build / npm run check)

img/proyectos/        Fotografías de cada proyecto
img/site/             Fondos y logo usados en la portada
video/                Videos optimizados que sirve la web (hero, floorplan)
vendor/               GSAP y ScrollTrigger (librerías de terceros)
scripts/              Scripts de Node para sincronizar y empaquetar el sitio
dist/                 Paquete de publicación generado por `npm run build` (no se versiona)

docs/                 Material de referencia y auditoría, no lo consume la web
docs/_review/          Capturas y candidatos de portada usados durante la revisión
```

## Actualizar proyectos

1. Edita únicamente `projects.json` para cambiar nombres, portadas, fotografías y datos de los proyectos. Conserva los `id` para que sigan funcionando los enlaces a galerías. Los datos que no estén confirmados pueden permanecer en `null`.
2. Coloca las imágenes en `img/proyectos/` y registra sus dimensiones reales. La portada debe figurar también en la galería con las mismas dimensiones. Las imágenes generales del sitio (fondos y logo) viven en `img/site/`.
3. Ejecuta `npm run build` desde esta carpeta con Node.js 18 o posterior. No hace falta ejecutar `npm install`.
4. Ejecuta `npm run check` y revisa las dos páginas en escritorio y móvil antes de publicarlas.

Si PowerShell bloquea los scripts de npm, usa `npm.cmd run build` y `npm.cmd run check`.

`projects.json` es la fuente de edición. La copia JSON integrada en `proyectos.html` es generada para que las galerías también funcionen al abrir el archivo con `file://`. El mismo comando sincroniza los nombres, portadas y metadatos de las cuatro obras de la portada, además de la fotografía y el conteo de «Más proyectos». Conserva el resto del HTML, los estilos y las animaciones.

`home.featured` define, por ID y en orden, los cuatro proyectos de la rueda actual; cambiar la cantidad requiere adaptar su diseño y animación. `home.archiveCover` elige la portada de «Más proyectos». El campo opcional `displayName` permite ajustar cómo se escribe un nombre en la portada sin cambiar el nombre del archivo de proyectos. El campo histórico `featured` de cada proyecto no controla esta selección.

No edites manualmente el bloque `<script id="projects-data">` ni los nombres, rutas o conteos de proyectos en `index.html`: se regeneran desde los datos. `npm run check` detecta desincronizaciones, identificadores repetidos, galerías vacías, imágenes o recursos locales faltantes y errores de sintaxis de los scripts.

`docs/projects-source.json`, `docs/PROJECTS-INVENTORY.md` y `docs/PROJECTS-PHOTO-AUDIT.md` documentan el origen y la revisión de las fotografías; no son fuentes de datos que consuma la web.

## Archivos para publicar y Git

`npm run build` sincroniza los datos, comprueba el sitio y prepara `dist/` con todos los archivos de producción, incluidos los recursos nuevos que todavía no están registrados en Git. Para publicar, sube el contenido de `dist/` conservando las rutas relativas. Este comando no publica el sitio. El manifiesto `.tejaz-build.json` permite reconstruir el paquete y retirar únicamente archivos generados que ya no se utilizan; si encuentra archivos ajenos en `dist/`, se detiene sin sobrescribirlos.

El paquete contiene las dos páginas, los datos, las imágenes de proyectos y del sitio (`img/site/`), los scripts y los medios usados, incluido `img/site/logo-tejaz-mark.png`. Excluye los documentos de auditoría, `docs/_review/`, las páginas de trabajo y los vídeos originales que no usa la web.

El video de la portada usa `video/hero-desktop.mp4` o `video/hero-mobile.mp4` según el tamaño inicial de pantalla, con `video/hero-poster.jpg` como imagen de respaldo. La bienvenida utiliza `video/floorplan.mp4`.

Las copias optimizadas conservan la secuencia completa de 30,63 segundos a 30 fps. Escritorio mantiene 1024 × 576 y pesa 3,28 MB (48 % menos); móvil usa 640 × 360 y pesa 1,43 MB (77 % menos). Son MP4 H.264 sin la pista de audio que el fondo ya silenciaba, preparados para comenzar a reproducirse sin descargar el archivo completo. El poster procede del segundo 12 del mismo video.

La portada comienza a cargar el video cuando está visible y la bienvenida ha terminado. Lo pausa al salir de pantalla o al ocultar la pestaña. Con movimiento reducido o ahorro de datos usa el poster sin descargar videos. Si la bienvenida no comienza en cinco segundos, libera la página; también tiene respaldo ante errores de carga o reproducción.

La descripción SEO está en `<meta name="description">` dentro de `index.html`: resume los servicios y las ciudades que ya aparecen en la página. No modifica el contenido visible.

Antes de guardar una versión, ejecuta `git status --short` y revisa `git diff`. Los cambios sin registrar y los archivos nuevos son trabajo local: no se deben descartar. Incluye en la versión que publiques los HTML generados y sus recursos nuevos para evitar que falten al subir el sitio. Los comandos de este proyecto no añaden archivos al área de preparación ni crean commits.
