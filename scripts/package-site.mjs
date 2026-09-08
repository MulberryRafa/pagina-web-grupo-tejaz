import { copyFileSync, lstatSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { productionFiles, root } from './site-files.mjs';

const destination = resolve(root, 'dist');
const manifestName = '.tejaz-build.json';

function checkedPath(base, name) {
  const filename = resolve(base, name);
  const local = relative(base, filename);
  if (!local || local.startsWith('..') || isAbsolute(local)) throw new Error(`Ruta fuera del paquete: ${name}`);
  let current = base;
  for (const part of local.split(sep)) {
    current = resolve(current, part);
    if (lstatSync(current, { throwIfNoEntry: false })?.isSymbolicLink()) throw new Error(`No se empaquetan enlaces simbólicos: ${current}`);
  }
  return filename;
}

function existingFiles(directory, prefix = '') {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const name = prefix + entry.name;
    if (entry.isSymbolicLink()) throw new Error(`Enlace inesperado en dist: ${name}`);
    return entry.isDirectory() ? existingFiles(resolve(directory, entry.name), name + '/') : [name];
  });
}

try {
  if (relative(root, destination) !== 'dist') throw new Error('El destino debe ser la carpeta dist de este proyecto.');
  const files = productionFiles();
  const destinationStat = lstatSync(destination, { throwIfNoEntry: false });
  if (destinationStat && (!destinationStat.isDirectory() || destinationStat.isSymbolicLink())) throw new Error('dist existe y no es una carpeta local válida.');
  const existing = destinationStat ? existingFiles(destination) : [];
  const manifestPath = checkedPath(destination, manifestName);
  let previous = [];
  if (existing.length) {
    if (!existing.includes(manifestName)) throw new Error('dist contiene archivos ajenos al generador; no se sobrescribió.');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    if (manifest.generator !== 'grupo-tejaz' || !Array.isArray(manifest.files)) throw new Error('El manifiesto de dist no es válido.');
    previous = manifest.files;
    for (const name of previous) checkedPath(destination, name);
    const known = new Set([...previous, manifestName]);
    if (existing.some(name => !known.has(name))) throw new Error('dist contiene archivos no incluidos en su manifiesto; no se sobrescribió.');
  }
  // Verificar todas las rutas antes de copiar o retirar un archivo generado.
  for (const name of files) { checkedPath(root, name); checkedPath(destination, name); }
  mkdirSync(destination, { recursive: true });
  for (const name of files) {
    const filename = checkedPath(destination, name);
    mkdirSync(dirname(filename), { recursive: true });
    copyFileSync(checkedPath(root, name), filename);
  }
  const current = new Set(files);
  for (const name of previous) {
    const filename = checkedPath(destination, name);
    if (!current.has(name) && lstatSync(filename, { throwIfNoEntry: false })?.isFile()) unlinkSync(filename);
  }
  writeFileSync(manifestPath, JSON.stringify({ generator: 'grupo-tejaz', files }, null, 2) + '\n', 'utf8');
  console.log(`Paquete local listo en dist/: ${files.length} archivos. No se publicó ni se modificó Git.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
