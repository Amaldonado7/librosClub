const fs = require('node:fs');
const path = require('node:path');

const { isAllowedCoverUrl } = require('./lib/giftCoverUrl');

const SEED_JSON = path.join(__dirname, '..', 'migrations', 'seed', 'gift_books.json');
const CANDIDATES_JSON = path.join(__dirname, 'out', 'gift-cover-candidates.json');

function validateCandidatesFile(data) {
  if (!Array.isArray(data)) return 'el archivo de candidatos debe ser un array';
  for (const [index, entry] of data.entries()) {
    const valid = entry !== null
      && typeof entry === 'object'
      && Number.isInteger(entry.id)
      && Array.isArray(entry.candidates)
      && (entry.approvedVolumeId === null || typeof entry.approvedVolumeId === 'string');
    if (!valid) return `la entrada ${index} no tiene id entero, candidates array y approvedVolumeId string o null`;
  }
  return null;
}

function applyApprovals(books, entries) {
  const result = {
    books: books.map((book) => ({ ...book })),
    applied: [],
    unapproved: [],
    mismatched: [],
    rejected: [],
    unknown: [],
  };
  const byId = new Map(result.books.map((book) => [book.id, book]));
  for (const entry of entries) {
    const target = byId.get(entry.id);
    if (!target) {
      result.unknown.push(entry.id);
      continue;
    }
    target.coverUrl = null;
    if (entry.approvedVolumeId === null) {
      result.unapproved.push(entry.id);
      continue;
    }
    const approved = entry.candidates.find((c) => c && c.volumeId === entry.approvedVolumeId);
    if (!approved) {
      result.mismatched.push(entry.id);
    } else if (!isAllowedCoverUrl(approved.coverUrl)) {
      result.rejected.push(entry.id);
    } else {
      target.coverUrl = approved.coverUrl;
      result.applied.push(entry.id);
    }
  }
  return result;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function run({
  candidatesPath = CANDIDATES_JSON,
  seedPath = SEED_JSON,
  log = console.log,
  error = console.error,
} = {}) {
  let entries;
  try {
    entries = readJson(candidatesPath);
  } catch {
    error(`No se pudo leer ${path.basename(candidatesPath)}: corré npm run covers:gift:find y revisá que sea JSON válido`);
    return 1;
  }
  const invalid = validateCandidatesFile(entries);
  if (invalid) {
    error(`Archivo de candidatos inválido: ${invalid}`);
    return 1;
  }
  let books;
  try {
    books = readJson(seedPath);
    if (!Array.isArray(books)) throw new Error('catálogo inválido');
  } catch {
    error(`No se pudo leer ${path.basename(seedPath)}: revisá que exista y sea un array JSON`);
    return 1;
  }

  const result = applyApprovals(books, entries);
  try {
    fs.writeFileSync(seedPath, `${JSON.stringify(result.books, null, 2)}\n`);
  } catch {
    error(`No se pudo escribir ${path.basename(seedPath)}`);
    return 1;
  }

  for (const id of result.unknown) log(`Libro ${id}: no existe en el catálogo, se ignora`);
  for (const id of result.mismatched) log(`Libro ${id}: sin coincidencia entre approvedVolumeId y sus candidatos, queda sin portada`);
  for (const id of result.rejected) error(`Libro ${id}: portada rechazada (no cumple la regla de URL), queda sin portada`);
  log(`Resumen: aplicadas ${result.applied.length}, sin aprobar ${result.unapproved.length}, sin coincidencia ${result.mismatched.length}, rechazadas ${result.rejected.length}`);
  return result.rejected.length > 0 ? 1 : 0;
}

if (require.main === module) process.exitCode = run();

module.exports = { run, applyApprovals, validateCandidatesFile };
