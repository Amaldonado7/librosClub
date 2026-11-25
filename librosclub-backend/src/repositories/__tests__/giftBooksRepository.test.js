const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const dbPath = require.resolve(path.join(__dirname, '..', '..', 'config', 'db'));
const queries = [];
let responder = () => ({ rows: [] });
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: {
    query: async (sql, params) => {
      queries.push({ sql, params });
      return responder(sql, params);
    },
  },
};

const repository = require('../giftBooksRepository');

beforeEach(() => {
  queries.length = 0;
  responder = () => ({ rows: [] });
});

describe('giftBooksRepository.findActiveForAges', () => {
  it('ejecuta una sola consulta parametrizada y devuelve las filas', async () => {
    const rows = [{ id: 1 }, { id: 2 }];
    responder = () => ({ rows });
    const result = await repository.findActiveForAges(['joven', 'adulto']);
    assert.equal(result, rows);
    assert.equal(queries.length, 1);
    const [{ sql, params }] = queries;
    assert.deepEqual(params, [['joven', 'adulto']]);
    assert.ok(sql.includes('$1::text[]'));
    assert.ok(sql.includes('active = true'));
    assert.ok(sql.includes('ORDER BY id'));
    assert.ok(sql.includes('FROM public.gift_books'));
    assert.equal(sql.includes('joven'), false);
  });

  it('solo lee: sin INSERT, UPDATE ni DELETE y sin otras funciones exportadas', async () => {
    await repository.findActiveForAges(['adulto', 'joven']);
    assert.match(queries[0].sql.trim(), /^SELECT/);
    assert.equal(/\b(INSERT|UPDATE|DELETE)\b/i.test(queries[0].sql), false);
    assert.deepEqual(Object.keys(repository), ['findActiveForAges', 'findActiveCoverUrl']);
  });

  it('propaga el error de la base sin capturarlo', async () => {
    responder = () => { throw new Error('relation "gift_books" does not exist'); };
    await assert.rejects(repository.findActiveForAges(['joven', 'adulto']), /gift_books/);
  });
});

describe('giftBooksRepository.findActiveCoverUrl', () => {
  it('ejecuta una consulta parametrizada de solo lectura por id y libro activo', async () => {
    responder = () => ({ rows: [{ coverUrl: 'https://books.google.com/books/content?id=x' }] });
    const result = await repository.findActiveCoverUrl(5);
    assert.equal(result, 'https://books.google.com/books/content?id=x');
    assert.equal(queries.length, 1);
    const [{ sql, params }] = queries;
    assert.equal(sql, 'SELECT cover_url AS "coverUrl" FROM public.gift_books WHERE id = $1 AND active = true');
    assert.deepEqual(params, [5]);
    assert.ok(sql.includes('$1'));
    assert.ok(sql.includes('active = true'));
    assert.equal(sql.includes('5'), false);
    assert.equal(/\b(INSERT|UPDATE|DELETE)\b/i.test(sql), false);
  });

  it('devuelve null si no hay filas', async () => {
    responder = () => ({ rows: [] });
    assert.equal(await repository.findActiveCoverUrl(7), null);
  });

  it('devuelve null si cover_url es NULL', async () => {
    responder = () => ({ rows: [{ coverUrl: null }] });
    assert.equal(await repository.findActiveCoverUrl(7), null);
  });

  it('propaga el error de la base', async () => {
    responder = () => { throw new Error('connection refused'); };
    await assert.rejects(repository.findActiveCoverUrl(7), /connection refused/);
  });
});
