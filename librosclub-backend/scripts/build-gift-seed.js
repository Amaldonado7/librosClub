const fs = require('node:fs');
const path = require('node:path');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');
const SEED_JSON = path.join(MIGRATIONS_DIR, 'seed', 'gift_books.json');
const FROZEN_JSON = path.join(MIGRATIONS_DIR, 'seed', 'frozen.json');
const OUTPUT_NAME = '003_seed_gift_books.sql';
const FROZEN_MESSAGE = '003 está congelada (aplicada en producción): creá una migración 004+ con INSERT ... ON CONFLICT (id) DO UPDATE / UPDATE explícitos';

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

function main() {
  if (isFrozen(OUTPUT_NAME)) {
    console.error(FROZEN_MESSAGE);
    process.exitCode = 1;
    return;
  }
  const books = JSON.parse(fs.readFileSync(SEED_JSON, 'utf8'));
  fs.writeFileSync(path.join(MIGRATIONS_DIR, OUTPUT_NAME), buildSeedSql(books));
}

if (require.main === module) main();

module.exports = {
  buildSeedSql, isFrozen, readFrozen, FROZEN_MESSAGE, OUTPUT_NAME, SEED_JSON, FROZEN_JSON, MIGRATIONS_DIR,
};
