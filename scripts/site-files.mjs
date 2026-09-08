import { readFileSync, statSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const pages = ['index.html', 'proyectos.html'];

export function productionFiles() {
  const files = new Set([...pages, 'projects.json']);
  function addReference(reference, source) {
    if (!reference || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(reference)) return;
    reference = reference.split(/[?#]/)[0];
    if (!reference) return;
    const filename = resolve(root, decodeURIComponent(reference));
    const local = relative(root, filename);
    if (local.startsWith('..') || isAbsolute(local)) throw new Error(`${source}: recurso fuera del proyecto: ${reference}`);
    if (!statSync(filename, { throwIfNoEntry: false })?.isFile()) throw new Error(`${source}: falta el recurso ${reference}`);
    files.add(local.replace(/\\/g, '/'));
  }
  for (const name of pages) {
    const html = readFileSync(resolve(root, name), 'utf8');
    // Los atributos data-*-src forman parte de la selección del video del hero.
    for (const match of html.matchAll(/(?:\bsrc|\bposter|\bhref|\bdata-(?:desktop|mobile)-src)\s*=\s*["']([^"']*)["']/gi)) {
      addReference(match[1], name);
    }
    for (const match of html.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^'"\s)]+))\s*\)/gi)) {
      addReference(match[1] || match[2] || match[3], name);
    }
  }
  const data = JSON.parse(readFileSync(resolve(root, 'projects.json'), 'utf8'));
  for (const project of data.projects) {
    addReference(project.cover, project.id);
    for (const image of project.images) addReference(image.src, project.id);
  }
  return [...files].sort();
}
