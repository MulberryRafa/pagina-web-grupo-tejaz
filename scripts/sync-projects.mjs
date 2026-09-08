import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dataBlock = /(<script id="projects-data" type="application\/json">)[\s\S]*?(<\/script>)/g;

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

export function validateProjects(data, projectRoot = root) {
  requireCondition(Array.isArray(data.projects) && data.projects.length > 0, 'projects debe contener al menos un proyecto.');
  const ids = new Set();
  const slugs = new Set();
  const assets = new Set();
  const positiveInteger = value => Number.isInteger(value) && value > 0;
  function imagePath(src, label) {
    requireCondition(typeof src === 'string' && /^img\/proyectos\/[a-z0-9./_-]+\.(?:jpe?g|png|webp|avif)$/i.test(src), `${label}: ruta de imagen no válida.`);
    const filename = resolve(projectRoot, src);
    const local = relative(resolve(projectRoot, 'img/proyectos'), filename);
    requireCondition(local && !local.startsWith('..') && !isAbsolute(local), `${label}: la imagen debe estar dentro de img/proyectos/.`);
    requireCondition(statSync(filename, { throwIfNoEntry: false })?.isFile(), `${label}: falta ${src}.`);
    assets.add(src);
  }
  for (const p of data.projects) {
    requireCondition(p && typeof p === 'object', 'Cada proyecto debe ser un objeto.');
    requireCondition(typeof p.id === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.id) && !ids.has(p.id), `ID inválido o repetido: ${p.id}.`);
    ids.add(p.id);
    requireCondition(typeof p.slug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug) && !slugs.has(p.slug), `Slug inválido o repetido: ${p.slug}.`);
    slugs.add(p.slug);
    requireCondition(typeof p.name === 'string' && p.name.trim(), `${p.id}: falta el nombre.`);
    requireCondition(p.displayName == null || (typeof p.displayName === 'string' && p.displayName.trim()), `${p.id}: displayName debe ser texto.`);
    requireCondition(positiveInteger(p.coverWidth) && positiveInteger(p.coverHeight), `${p.id}: dimensiones de portada no válidas.`);
    imagePath(p.cover, p.id);
    requireCondition(Array.isArray(p.images) && p.images.length > 0, `${p.id}: la galería está vacía.`);
    const images = new Set();
    for (const image of p.images) {
      requireCondition(image && positiveInteger(image.width) && positiveInteger(image.height), `${p.id}: dimensiones de imagen no válidas.`);
      requireCondition(!images.has(image.src), `${p.id}: imagen repetida ${image.src}.`);
      images.add(image.src);
      imagePath(image.src, p.id);
    }
    const cover = p.images.find(image => image.src === p.cover);
    requireCondition(cover && cover.width === p.coverWidth && cover.height === p.coverHeight, `${p.id}: la portada y sus dimensiones deben coincidir con una imagen de la galería.`);
    for (const field of ['category', 'location']) {
      requireCondition(p[field] == null || typeof p[field] === 'string', `${p.id}: ${field} debe ser texto o null.`);
    }
    requireCondition(p.year == null || typeof p.year === 'string' || positiveInteger(p.year), `${p.id}: year debe ser texto, año numérico o null.`);
  }
  requireCondition(Array.isArray(data.home?.featured) && data.home.featured.length === 4, 'home.featured debe contener exactamente cuatro IDs: la rueda actual tiene cuatro posiciones.');
  requireCondition(new Set(data.home.featured).size === 4 && data.home.featured.every(id => ids.has(id)), 'home.featured contiene un ID repetido o inexistente.');
  requireCondition(ids.has(data.home.archiveCover), 'home.archiveCover debe identificar un proyecto existente.');
  return { projects: ids.size, images: assets.size };
}

function replaceOnce(html, pattern, replacement, label) {
  let count = 0;
  const updated = html.replace(pattern, (...args) => {
    count++;
    return replacement(...args);
  });
  requireCondition(count === 1, `No se pudo localizar una única sección ${label}; no se escribió ningún archivo.`);
  return updated;
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function setAttribute(tag, name, value) {
  const pattern = new RegExp(` ${name}="[^"]*"`, 'g');
  if (value == null || value === '') return tag.replace(pattern, '');
  const attribute = ` ${name}="${escapeHTML(value)}"`;
  return pattern.test(tag) ? tag.replace(pattern, () => attribute) : tag.replace(/>$/, attribute + '>');
}

function displayName(project) {
  // Conserva siglas como MI, L91 y OLI; permite una excepción editorial explícita.
  return project.displayName || project.name.replace(/\b[A-ZÁÉÍÓÚÑ]{4,}\b/g, word => word[0] + word.slice(1).toLocaleLowerCase('es'));
}

export function renderArchive(html, data) {
  const newline = html.includes('\r\n') ? '\r\n' : '\n';
  const serialized = JSON.stringify(data, null, 2)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
    .replace(/\n/g, newline);
  return replaceOnce(html, dataBlock, (_all, open, close) => open + serialized + close, 'projects-data');
}

export function renderHome(html, data) {
  const byId = new Map(data.projects.map(project => [project.id, project]));
  const featured = data.home.featured.map(id => byId.get(id));
  for (const [index, project] of featured.entries()) {
    const name = displayName(project);
    const platePattern = new RegExp(`(<div class="wplate" data-i="${index}"[^>]*>)([\\s\\S]*?<div class="wcap"[^>]*>)([^<]*)(<\\/div>)`, 'g');
    html = replaceOnce(html, platePattern, (_all, open, middle, _caption, close) => {
      open = setAttribute(open, 'data-name', name);
      open = setAttribute(open, 'aria-label', 'Centrar ' + name);
      open = setAttribute(open, 'data-type', project.category);
      open = setAttribute(open, 'data-place', project.location);
      open = setAttribute(open, 'data-year', project.year);
      middle = replaceOnce(middle, new RegExp(`<img id="proj-${index + 1}"[^>]*>`, 'g'), tag => setAttribute(setAttribute(tag, 'src', project.cover), 'alt', name), `imagen de proyecto ${index + 1}`);
      return open + middle + escapeHTML(project.name) + close;
    }, `wplate ${index}`);
  }
  html = replaceOnce(html, /(<div id="wd-name"[^>]*>)[^<]*(<\/div>)/g, (_all, open, close) => open + escapeHTML(displayName(featured[0])) + close, 'wd-name');
  html = replaceOnce(html, /(<div id="wd-stat"[^>]*>)[^<]*(<\/div>)/g, (_all, open, close) => open + escapeHTML([featured[0].category, featured[0].location, featured[0].year].filter(Boolean).join(' · ')) + close, 'wd-stat');
  html = replaceOnce(html, /(<a id="obras-more"[^>]*>)([\s\S]*?)(<\/a>)/g, (_all, open, content, close) => {
    open = setAttribute(open, 'aria-label', `Más proyectos — ver los ${data.projects.length} proyectos de Grupo Tejaz`);
    content = replaceOnce(content, /<img\b[^>]*>/g, tag => setAttribute(tag, 'src', byId.get(data.home.archiveCover).cover), 'portada de Más proyectos');
    content = replaceOnce(content, /VER LOS \d+ PROYECTOS/g, () => `VER LOS ${data.projects.length} PROYECTOS`, 'conteo de Más proyectos');
    return open + content + close;
  }, 'obras-more');
  return html;
}

function main() {
  requireCondition(process.argv.slice(2).every(arg => arg === '--check'), 'Uso: node scripts/sync-projects.mjs [--check]');
  const check = process.argv.includes('--check');
  const data = JSON.parse(readFileSync(resolve(root, 'projects.json'), 'utf8'));
  const counts = validateProjects(data);
  // Primero se validan y generan ambos documentos en memoria; solo después se escribe.
  const targets = [['proyectos.html', renderArchive], ['index.html', renderHome]].map(([name, render]) => {
    const filename = resolve(root, name);
    const original = readFileSync(filename, 'utf8');
    return { name, filename, original, updated: render(original, data) };
  });
  const changed = targets.filter(target => target.original !== target.updated);
  if (check && changed.length) throw new Error(`Datos desincronizados en ${changed.map(target => target.name).join(', ')}. Ejecuta npm run build.`);
  for (const target of changed) writeFileSync(target.filename, target.updated, 'utf8');
  console.log(`${counts.projects} proyectos y ${counts.images} imágenes verificados. ${check ? 'HTML sincronizado.' : changed.length ? `Actualizado: ${changed.map(target => target.name).join(', ')}.` : 'HTML ya actualizado.'}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
