import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Script } from 'node:vm';
import { pages, productionFiles, root } from './site-files.mjs';

let scripts = 0;

try {
  const files = productionFiles();
  for (const name of pages) {
    const html = readFileSync(resolve(root, name), 'utf8');
    for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
      if (/\bsrc\s*=|\btype\s*=\s*["']application\/json["']/i.test(match[1])) continue;
      new Script(match[2], { filename: name + ':inline-' + ++scripts });
    }
  }
  for (const filename of files) {
    if (filename.endsWith('.js')) new Script(readFileSync(resolve(root, filename), 'utf8'), { filename });
  }
  console.log(`${scripts} scripts integrados y ${files.length} archivos de producción verificados.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
