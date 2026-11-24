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
    assert.deepEqual(Object.keys(repository), ['findActiveForAges']);
  });

  it('propaga el error de la base sin capturarlo', async () => {
    responder = () => { throw new Error('relation "gift_books" does not exist'); };
    await assert.rejects(repository.findActiveForAges(['joven', 'adulto']), /gift_books/);
  });
});
