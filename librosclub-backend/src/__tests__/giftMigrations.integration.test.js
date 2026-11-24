const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const DB_URL = process.env.GIFT_DB_TEST_URL;
const skip = DB_URL ? false : 'GIFT_DB_TEST_URL no está definida: test de integración con PostgreSQL omitido';

const migration002 = fs.readFileSync(
  path.join(__dirname, '..', '..', 'migrations', '002_create_gift_books.sql'),
  'utf8',
);

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
