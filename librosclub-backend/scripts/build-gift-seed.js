const fs = require('node:fs');
const path = require('node:path');

const { isAllowedCoverUrl } = require('./lib/giftCoverUrl');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');
const SEED_JSON = path.join(MIGRATIONS_DIR, 'seed', 'gift_books.json');
const FROZEN_JSON = path.join(MIGRATIONS_DIR, 'seed', 'frozen.json');
const OUTPUT_NAME = '003_seed_gift_books.sql';
const COVERS_OUTPUT_NAME = '004_update_gift_books_covers.sql';

const COLUMNS = [
  ['id', 'id'],
  ['title', 'title'],
  ['author', 'author'],
  ['cover_url', 'coverUrl'],
  ['cover_color', 'coverColor'],
  ['genre_label', 'genreLabel'],
  ['why', 'why'],
  ['dedication', 'dedication'],
  ['share_quote', 'shareQuote'],
  ['age_ranges', 'ageRanges'],
  ['reading_levels', 'readingLevels'],
  ['hooks', 'hooks'],
  ['kinds', 'kinds'],
  ['length', 'length'],
  ['tones', 'tones'],
  ['active', 'active'],
];

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlValue(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (Number.isInteger(value)) return String(value);
  if (Array.isArray(value)) return `ARRAY[${value.map(sqlString).join(', ')}]::text[]`;
  return sqlString(value);
}

function buildSeedSql(books) {
  const columnList = COLUMNS.map(([column]) => column).join(', ');
  const inserts = [...books]
    .sort((a, b) => a.id - b.id)
    .map((book) => {
      const values = COLUMNS.map(([, key]) => sqlValue(book[key])).join(', ');
      return `INSERT INTO public.gift_books (${columnList}) VALUES (${values}) ON CONFLICT (id) DO NOTHING;`;
    });
  return [
    'BEGIN;',
    ...inserts,
    "SELECT setval(pg_get_serial_sequence('public.gift_books', 'id'), (SELECT MAX(id) FROM public.gift_books));",
    'COMMIT;',
    '',
  ].join('\n');
}

function readFrozen(frozenPath = FROZEN_JSON) {
  if (!fs.existsSync(frozenPath)) return {};
  return JSON.parse(fs.readFileSync(frozenPath, 'utf8'));
}

function isFrozen(fileName, frozenPath = FROZEN_JSON) {
  return Object.prototype.hasOwnProperty.call(readFrozen(frozenPath), fileName);
}

function buildCoversSql(books) {
  const updates = books
    .filter((book) => book.coverUrl !== null && book.coverUrl !== undefined)
    .sort((a, b) => a.id - b.id)
    .map((book) => {
      if (!Number.isInteger(book.id) || book.id <= 0 || !isAllowedCoverUrl(book.coverUrl)) {
        throw new Error(`coverUrl inválida en el libro ${book.id}`);
      }
      return `UPDATE public.gift_books SET cover_url = ${sqlString(book.coverUrl)}, updated_at = now() WHERE id = ${book.id};`;
    });
  return ['BEGIN;', ...updates, 'COMMIT;', ''].join('\n');
}

function build({
  migrationsDir = MIGRATIONS_DIR,
  seedPath = SEED_JSON,
  frozenPath = FROZEN_JSON,
  log = console.log,
  error = console.error,
} = {}) {
  let books;
  let frozen;
  try {
    books = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
    frozen = readFrozen(frozenPath);
  } catch {
    error(`No se pudo leer ${path.basename(seedPath)} o ${path.basename(frozenPath)}: revisá que exista y sea JSON válido`);
    return 1;
  }
  if (!Array.isArray(books)) {
    error(`${path.basename(seedPath)} debe ser un array de libros`);
    return 1;
  }
  let outputs;
  try {
    outputs = [[OUTPUT_NAME, buildSeedSql(books)], [COVERS_OUTPUT_NAME, buildCoversSql(books)]];
  } catch (err) {
    error(err.message);
    return 1;
  }
  for (const [fileName, sql] of outputs) {
    if (Object.prototype.hasOwnProperty.call(frozen, fileName)) {
      log(`${fileName} congelada: no se reescribe`);
    } else {
      fs.writeFileSync(path.join(migrationsDir, fileName), sql);
    }
  }
  return 0;
}

if (require.main === module) process.exitCode = build();

module.exports = {
  buildSeedSql,
  buildCoversSql,
  build,
  isFrozen,
  readFrozen,
  OUTPUT_NAME,
  COVERS_OUTPUT_NAME,
  SEED_JSON,
  FROZEN_JSON,
  MIGRATIONS_DIR,
};
