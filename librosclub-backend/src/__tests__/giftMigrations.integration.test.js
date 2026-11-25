const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const DB_URL = process.env.GIFT_DB_TEST_URL;
const skip = DB_URL ? false : 'GIFT_DB_TEST_URL no está definida: test de integración con PostgreSQL omitido';

const { buildCoversSql } = require('../../scripts/build-gift-seed');

const MIGRATIONS_DIR = path.join(__dirname, '..', '..', 'migrations');
const migration002 = fs.readFileSync(path.join(MIGRATIONS_DIR, '002_create_gift_books.sql'), 'utf8');
const migration003 = fs.readFileSync(path.join(MIGRATIONS_DIR, '003_seed_gift_books.sql'), 'utf8');
const migration004 = fs.readFileSync(path.join(MIGRATIONS_DIR, '004_update_gift_books_covers.sql'), 'utf8');

const EXPECTED_COLUMNS = [
  'id', 'title', 'author', 'cover_url', 'cover_color', 'genre_label', 'why', 'dedication',
  'share_quote', 'age_ranges', 'reading_levels', 'hooks', 'kinds', 'length', 'tones',
  'active', 'created_at', 'updated_at',
];

function validRow(overrides = {}) {
  return {
    title: 'Libro de prueba',
    author: 'Autora de prueba',
    cover_color: '#5E5827',
    genre_label: 'Prueba',
    why: 'Porque sí.',
    dedication: 'Para vos.',
    share_quote: 'Una frase corta.',
    age_ranges: ['adulto'],
    reading_levels: ['mensual'],
    hooks: ['amor'],
    kinds: ['novela'],
    length: 'corto',
    tones: ['liviano'],
    ...overrides,
  };
}

describe('migración 002: public.gift_books', { skip }, () => {
  let client;
  let savepoint = 0;

  before(async () => {
    const { Client } = require('pg');
    client = new Client({ connectionString: DB_URL });
    await client.connect();
    await client.query('BEGIN');
    await client.query('DROP TABLE IF EXISTS public.gift_books');
  });

  after(async () => {
    if (!client) return;
    await client.query('ROLLBACK');
    await client.end();
  });

  async function insertRow(row) {
    const columns = Object.keys(row);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    return client.query(
      `INSERT INTO public.gift_books (${columns.join(', ')}) VALUES (${placeholders})`,
      columns.map((c) => row[c]),
    );
  }

  async function attempt(row) {
    savepoint += 1;
    const name = `sp_${savepoint}`;
    await client.query(`SAVEPOINT ${name}`);
    try {
      await insertRow(row);
      await client.query(`RELEASE SAVEPOINT ${name}`);
      return null;
    } catch (err) {
      await client.query(`ROLLBACK TO SAVEPOINT ${name}`);
      return err;
    }
  }

  it('se aplica dos veces sin error y crea las 18 columnas', async () => {
    await client.query(migration002);
    await client.query(migration002);
    const { rows } = await client.query(
      "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gift_books'",
    );
    assert.deepEqual(rows.map((r) => r.column_name).sort(), [...EXPECTED_COLUMNS].sort());
  });

  it('rechaza un tono fuera de la lista', async () => {
    const err = await attempt(validRow({ tones: ['alegre'] }));
    assert.equal(err?.code, '23514');
  });

  it('rechaza share_quote de 121 caracteres o vacía y acepta 120', async () => {
    assert.equal((await attempt(validRow({ share_quote: 'a'.repeat(121) })))?.code, '23514');
    assert.equal((await attempt(validRow({ share_quote: '' })))?.code, '23514');
    assert.equal((await attempt(validRow({ share_quote: '   ' })))?.code, '23514');
    assert.equal(await attempt(validRow({ share_quote: 'a'.repeat(120) })), null);
  });

  it('rechaza un largo fuera de la lista', async () => {
    const err = await attempt(validRow({ length: 'enorme' }));
    assert.equal(err?.code, '23514');
  });

  it('rechaza age_ranges vacío', async () => {
    const err = await attempt(validRow({ age_ranges: [] }));
    assert.equal(err?.code, '23514');
  });

  it('solo acepta las edades joven y adulto', async () => {
    for (const ages of [['mayor'], ['chico'], ['adolescente']]) {
      assert.equal((await attempt(validRow({ age_ranges: ages })))?.code, '23514', ages[0]);
    }
    assert.equal(await attempt(validRow({ age_ranges: ['joven', 'adulto'] })), null);
  });
});

function withoutTransactionLines(sql) {
  return sql
    .split('\n')
    .filter((line) => line.trim() !== 'BEGIN;' && line.trim() !== 'COMMIT;')
    .join('\n');
}

async function applyMigration(client, sql) {
  const body = withoutTransactionLines(sql);
  if (body.trim() === '') return;
  await client.query(body);
}

describe('helpers de migraciones con transacción propia', () => {
  it('withoutTransactionLines quita BEGIN y COMMIT y conserva los UPDATE', () => {
    assert.equal(withoutTransactionLines('BEGIN;\nCOMMIT;\n').trim(), '');
    const sql = buildCoversSql([{ id: 4, coverUrl: 'https://books.google.com/books/content?id=x' }]);
    const body = withoutTransactionLines(sql);
    assert.equal(body.includes('BEGIN;'), false);
    assert.equal(body.includes('COMMIT;'), false);
    assert.ok(body.includes("UPDATE public.gift_books SET cover_url = 'https://books.google.com/books/content?id=x', updated_at = now() WHERE id = 4;"));
  });

  it('applyMigration no ejecuta nada con un cuerpo vacío y nunca envía el texto crudo', async () => {
    const queries = [];
    const fakeClient = { query: async (sql) => { queries.push(sql); } };
    await applyMigration(fakeClient, 'BEGIN;\nCOMMIT;\n');
    if (withoutTransactionLines(migration004).trim() === '') {
      await applyMigration(fakeClient, migration004);
    }
    assert.deepEqual(queries, []);
    await applyMigration(fakeClient, migration003);
    assert.equal(queries.length, 1);
    assert.notEqual(queries[0], migration003);
    assert.equal(queries[0].includes('BEGIN;'), false);
    assert.equal(queries[0].includes('COMMIT;'), false);
  });
});

const ANSWERS = {
  relationship: 'mama',
  occasion: 'navidad',
  age: 'adulto',
  readingLevel: 'mensual',
  hook: 'amor',
  kind: 'novela',
  length: 'indistinto',
  tone: 'emotivo',
};

const TEST_COVER_A = 'https://books.google.com/books/content?id=testA&printsec=frontcover&img=1&zoom=1';
const TEST_COVER_B = 'https://books.googleusercontent.com/books/content?id=testB&zoom=1';

function fakeResponse() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

describe('migraciones 003 y 004: portadas', { skip }, () => {
  let client;
  let getRecommendations;
  let savepoint = 0;

  before(async () => {
    const { Client } = require('pg');
    client = new Client({ connectionString: DB_URL });
    await client.connect();
    await client.query('BEGIN');
    await client.query('DROP TABLE IF EXISTS public.gift_books');
    await applyMigration(client, migration002);
    await applyMigration(client, migration003);
    const dbPath = require.resolve(path.join(__dirname, '..', 'config', 'db'));
    require.cache[dbPath] = {
      id: dbPath,
      filename: dbPath,
      loaded: true,
      exports: { query: (sql, params) => client.query(sql, params) },
    };
    ({ getRecommendations } = require('../controllers/giftController'));
  });

  after(async () => {
    if (!client) return;
    await client.query('ROLLBACK');
    await client.end();
  });

  async function recommend() {
    const res = fakeResponse();
    await getRecommendations({ body: { ...ANSWERS } }, res);
    return res;
  }

  async function snapshot() {
    const { rows } = await client.query('SELECT id, cover_url FROM public.gift_books ORDER BY id');
    return rows;
  }

  let recommendedIds;

  it('aplicar 004 agrega las portadas a las recomendaciones sin cambiar los libros', async () => {
    const before = await recommend();
    assert.equal(before.statusCode, 200);
    recommendedIds = before.body.books.map((book) => book.id);
    assert.equal(recommendedIds.length, 3);
    assert.ok(before.body.books.every((book) => book.coverUrl === null));

    const [a, b] = recommendedIds;
    await applyMigration(client, buildCoversSql([{ id: a, coverUrl: TEST_COVER_A }, { id: b, coverUrl: TEST_COVER_B }]));

    const after = await recommend();
    assert.equal(after.statusCode, 200);
    assert.deepEqual(after.body.books.map((book) => book.id), recommendedIds);
    assert.deepEqual(after.body.books.map((book) => book.coverUrl), [TEST_COVER_A, TEST_COVER_B, null]);
  });

  it('004 es idempotente y el 004 del repositorio se aplica sin error', async () => {
    const [a, b] = recommendedIds;
    const covers = buildCoversSql([{ id: a, coverUrl: TEST_COVER_A }, { id: b, coverUrl: TEST_COVER_B }]);
    await applyMigration(client, covers);
    const once = await snapshot();
    await applyMigration(client, covers);
    const twice = await snapshot();
    assert.deepEqual(twice, once);
    await applyMigration(client, migration004);
    await applyMigration(client, migration004);
    const { rows } = await client.query('SELECT 1 AS ok');
    assert.equal(rows[0].ok, 1);
  });

  it('una portada inválida en 004 no deja cambios parciales', async () => {
    const [a, b] = recommendedIds;
    const beforeRows = await snapshot();
    savepoint += 1;
    const name = `covers_${savepoint}`;
    await client.query(`SAVEPOINT ${name}`);
    const body = [
      'BEGIN;',
      `UPDATE public.gift_books SET cover_url = 'https://books.google.com/books/content?id=otra', updated_at = now() WHERE id = ${a};`,
      `UPDATE public.gift_books SET cover_url = 'http://books.google.com/x', updated_at = now() WHERE id = ${b};`,
      'COMMIT;',
      '',
    ].join('\n');
    let failure = null;
    try {
      await applyMigration(client, body);
    } catch (err) {
      failure = err;
    }
    await client.query(`ROLLBACK TO SAVEPOINT ${name}`);
    assert.equal(failure?.code, '23514');
    assert.deepEqual(await snapshot(), beforeRows);
  });
});
