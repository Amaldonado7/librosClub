import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const ASSETS = join(DIST, 'assets');
const MAX_GZIP_BYTES = 61440;
const REGALO_MARKER = 'El libro justo para cada persona';
const FORBIDDEN_IN_INITIAL = [REGALO_MARKER, '¿Para quién es el regalo?', 'Buscando entre los estantes'];

const fail = (message) => {
  console.error(`check-regalo-chunk: ${message}`);
  process.exit(1);
};

if (!existsSync(join(DIST, 'index.html')) || !existsSync(ASSETS)) {
  fail('no existe dist/; corré npm run build antes.');
}

const html = readFileSync(join(DIST, 'index.html'), 'utf8');
const attrOf = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]+)"`))?.[1];

const entryScripts = [...html.matchAll(/<script\b[^>]*>/g)]
  .map(([tag]) => tag)
  .filter((tag) => attrOf(tag, 'type') === 'module')
  .map((tag) => attrOf(tag, 'src'));
const preloads = [...html.matchAll(/<link\b[^>]*>/g)]
  .map(([tag]) => tag)
  .filter((tag) => attrOf(tag, 'rel') === 'modulepreload')
  .map((tag) => attrOf(tag, 'href'));

const initialChunk = new Set([...entryScripts, ...preloads].filter(Boolean).map((ref) => basename(ref)));
if (initialChunk.size === 0) fail('no se encontró el script de entrada en dist/index.html.');

const jsFiles = readdirSync(ASSETS).filter((entry) => entry.endsWith('.js'));
const contents = new Map(jsFiles.map((entry) => [entry, readFileSync(join(ASSETS, entry), 'utf8')]));

const regaloCandidates = jsFiles.filter((entry) => contents.get(entry).includes(REGALO_MARKER));
if (regaloCandidates.length !== 1) {
  fail(`se esperaba exactamente 1 chunk con el marcador de /regalo y hay ${regaloCandidates.length}.`);
}
const [regaloChunk] = regaloCandidates;

if (initialChunk.has(regaloChunk)) fail(`${regaloChunk} es parte del chunk inicial.`);

for (const entry of initialChunk) {
  const source = contents.get(entry);
  if (source === undefined) fail(`dist/index.html referencia ${entry}, que no está en dist/assets.`);
  const marker = FORBIDDEN_IN_INITIAL.find((text) => source.includes(text));
  if (marker) fail(`el chunk inicial ${entry} contiene "${marker}".`);
}

const gzipBytes = gzipSync(Buffer.from(contents.get(regaloChunk), 'utf8')).length;
console.log(`check-regalo-chunk: ${regaloChunk} ocupa ${gzipBytes} bytes gzip (máximo ${MAX_GZIP_BYTES}).`);
if (gzipBytes > MAX_GZIP_BYTES) fail(`${regaloChunk} supera el máximo de ${MAX_GZIP_BYTES} bytes gzip.`);
