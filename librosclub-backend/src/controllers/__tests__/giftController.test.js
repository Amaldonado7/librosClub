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

const { getRecommendations } = require('../giftController');
const asyncHandler = require('../../middlewares/asyncHandler');

const VALID = Object.freeze({
  relationship: 'mama',
  occasion: 'navidad',
  age: 'joven',
  readingLevel: 'vacaciones',
  hook: 'humor',
  kind: 'novela',
  length: 'corto',
  tone: 'liviano',
});

const BOOK_KEYS = ['id', 'title', 'author', 'genreLabel', 'coverUrl', 'coverColor', 'why', 'dedication', 'shareQuote', 'buyUrl'];

function row(overrides = {}) {
  return {
    id: 1,
    title: 'Libro',
    author: 'Autora',
    coverUrl: null,
    coverColor: '#5E5827',
    genreLabel: 'Género',
    why: 'Porque sí.',
    dedication: 'Para vos.',
    shareQuote: 'Frase.',
    ageRanges: ['joven'],
    readingLevels: ['vacaciones'],
    hooks: ['humor'],
    kinds: ['novela'],
    length: 'corto',
    tones: ['liviano'],
    active: true,
    ...overrides,
  };
}

function catalog() {
  return [
    row({ id: 1, title: 'Antes de que se enfríe el café', author: 'Toshikazu Kawaguchi' }),
    row({ id: 2, title: 'Dos', author: 'B', hooks: ['amor'] }),
    row({ id: 3, title: 'Tres', author: 'C', hooks: ['amor'], kinds: ['poesia'] }),
    row({ id: 4, title: 'Cuatro', author: 'D', hooks: ['misterio'], kinds: ['aprender'], tones: ['intenso'] }),
  ];
}

function fakeRes() {
  const res = { statusCode: 200, body: undefined };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
}

async function call(body) {
  const res = fakeRes();
  await getRecommendations({ body, headers: {} }, res);
  return res;
}

beforeEach(() => {
  queries.length = 0;
  responder = () => ({ rows: catalog() });
});

describe('giftController.getRecommendations', () => {
  it('responde 200 con el perfil y 3 libros con la forma del contrato', async () => {
    const res = await call({ ...VALID });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(Object.keys(res.body).sort(), ['books', 'profile']);
    assert.deepEqual(res.body.profile, { relationship: 'mama', occasion: 'navidad' });
    assert.equal(res.body.books.length, 3);
    for (const book of res.body.books) {
      assert.deepEqual(Object.keys(book).sort(), [...BOOK_KEYS].sort());
    }
    assert.deepEqual(res.body.books.map((b) => b.id), [1, 2, 3]);
    assert.equal(
      res.body.books[0].buyUrl,
      'https://www.buscalibre.com.ar/libros/search?q=Antes%20de%20que%20se%20enfr%C3%ADe%20el%20caf%C3%A9%20Toshikazu%20Kawaguchi',
    );
    assert.equal(res.body.books[0].coverUrl, null);
  });

  it('responde 400 sin consultar la base si falta una respuesta', async () => {
    const body = { ...VALID };
    delete body.age;
    const res = await call(body);
    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, { message: 'Falta la respuesta: age.' });
    assert.equal(queries.length, 0);
  });

  it('responde 400 si una respuesta es inválida', async () => {
    const res = await call({ ...VALID, tone: 'alegre' });
    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, { message: 'Respuesta inválida: tone.' });
    assert.equal(queries.length, 0);
  });

  it('responde 400 si el cuerpo no es un objeto', async () => {
    const res = await call(undefined);
    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, { message: 'Falta la respuesta: relationship.' });
  });

  for (const age of ['chico', 'adolescente', 'mayor']) {
    it(`responde 400 sin consultar la base si la edad es ${age}`, async () => {
      const res = await call({ ...VALID, age });
      assert.equal(res.statusCode, 400);
      assert.deepEqual(res.body, { message: 'Respuesta inválida: age.' });
      assert.equal(queries.length, 0);
    });
  }

  it('pide al repositorio las edades candidatas como parámetro, sin valores del cuerpo en el SQL', async () => {
    await call({ ...VALID, extra: "'; DROP TABLE users;" });
    assert.equal(queries.length, 1);
    assert.deepEqual(queries[0].params, [['joven', 'adulto']]);
    for (const value of [...Object.values(VALID), 'DROP']) {
      assert.equal(queries[0].sql.includes(`'${value}'`), false);
    }
    for (const { sql } of queries) {
      assert.match(sql.trim(), /^SELECT/);
      assert.equal(/\b(INSERT|UPDATE|DELETE)\b/i.test(sql), false);
    }
  });

  it('no devuelve libros inactivos', async () => {
    responder = () => ({
      rows: [row({ id: 9, author: 'Z', active: false }), ...catalog()],
    });
    const res = await call({ ...VALID });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.books.some((b) => b.id === 9), false);
  });

  it('responde 503 si no hay 3 libros', async () => {
    responder = () => ({ rows: catalog().slice(0, 2) });
    const res = await call({ ...VALID });
    assert.equal(res.statusCode, 503);
    assert.deepEqual(res.body, { message: 'No hay suficientes libros para recomendar en este momento.' });
  });

  it('elige los mismos libros sin importar relationship y occasion', async () => {
    const a = await call({ ...VALID });
    const b = await call({ ...VALID, relationship: 'amigo', occasion: 'porque_si' });
    assert.deepEqual(a.body.books, b.body.books);
    assert.deepEqual(b.body.profile, { relationship: 'amigo', occasion: 'porque_si' });
  });

  it('no expone etiquetas, estado ni puntaje', async () => {
    const res = await call({ ...VALID });
    for (const book of res.body.books) {
      for (const key of ['ageRanges', 'hooks', 'kinds', 'tones', 'readingLevels', 'length', 'active', 'score']) {
        assert.equal(Object.prototype.hasOwnProperty.call(book, key), false, key);
      }
    }
  });

  it('propaga el error de la base a next cuando se envuelve en asyncHandler', async () => {
    responder = () => { throw new Error('relation "gift_books" does not exist'); };
    await assert.rejects(call({ ...VALID }), /gift_books/);
    const forwarded = await new Promise((resolve) => {
      asyncHandler(getRecommendations)({ body: { ...VALID } }, fakeRes(), resolve);
    });
    assert.match(forwarded.message, /gift_books/);
  });
});
