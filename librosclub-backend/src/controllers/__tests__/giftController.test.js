const { describe, it, beforeEach, afterEach } = require('node:test');
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

const fetcherPath = require.resolve(path.join(__dirname, '..', '..', 'services', 'giftCoverFetcher'));
const fetcherCalls = [];
let fetcherResult = async () => ({ ok: false });
require.cache[fetcherPath] = {
  id: fetcherPath,
  filename: fetcherPath,
  loaded: true,
  exports: {
    fetchCoverImage: async (...args) => {
      fetcherCalls.push(args);
      return fetcherResult(...args);
    },
  },
};

const { getRecommendations, getCover } = require('../giftController');
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

const ALLOWED_COVER = 'https://books.google.com/books/content?id=abc&img=1';

function fakeCoverRes() {
  const res = { statusCode: 200, body: undefined, headers: {}, ended: undefined };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  res.set = (values) => { Object.assign(res.headers, values); return res; };
  res.end = (body) => { res.ended = body; return res; };
  return res;
}

async function callCover(id, extra = {}) {
  const res = fakeCoverRes();
  await getCover({ params: { id }, query: {}, body: undefined, headers: {}, ...extra }, res);
  return res;
}

describe('giftController.getCover', () => {
  let warnings;
  let originalWarn;

  beforeEach(() => {
    fetcherCalls.length = 0;
    fetcherResult = async () => ({ ok: false });
    responder = () => ({ rows: [{ coverUrl: ALLOWED_COVER }] });
    warnings = [];
    originalWarn = console.warn;
    console.warn = (...args) => { warnings.push(args.join(' ')); };
  });

  afterEach(() => {
    console.warn = originalWarn;
  });

  for (const id of ['abc', '0', '-1', '1.5', '01', '99999999999', '2147483648', '', undefined]) {
    it(`responde 400 sin consultar la base ni Google con id ${JSON.stringify(id)}`, async () => {
      const res = await callCover(id);
      assert.equal(res.statusCode, 400);
      assert.deepEqual(res.body, { message: 'Solicitud inválida.' });
      assert.equal(queries.length, 0);
      assert.equal(fetcherCalls.length, 0);
    });
  }

  it('acepta el id máximo 2147483647 y consulta la base con el número', async () => {
    responder = () => ({ rows: [] });
    const res = await callCover('2147483647');
    assert.equal(res.statusCode, 404);
    assert.deepEqual(queries[0].params, [2147483647]);
  });

  it('responde 404 si el libro no existe, está inactivo o no tiene portada', async () => {
    responder = () => ({ rows: [] });
    const missing = await callCover('5');
    responder = () => ({ rows: [{ coverUrl: null }] });
    const withoutCover = await callCover('5');
    for (const res of [missing, withoutCover]) {
      assert.equal(res.statusCode, 404);
      assert.deepEqual(res.body, { message: 'Portada no disponible.' });
    }
    assert.equal(fetcherCalls.length, 0);
  });

  for (const coverUrl of ['https://evil.example/x.jpg', 'http://169.254.169.254/latest', 'https://books.google.com:8443/x']) {
    it(`responde 404 sin llamar a Google si cover_url es ${coverUrl}`, async () => {
      responder = () => ({ rows: [{ coverUrl }] });
      const res = await callCover('5');
      assert.equal(res.statusCode, 404);
      assert.deepEqual(res.body, { message: 'Portada no disponible.' });
      assert.equal(fetcherCalls.length, 0);
    });
  }

  it('responde 502 y deja una sola línea de log sin URL si Google falla', async () => {
    const res = await callCover('5', {
      query: { url: 'https://evil.example/x.png' },
      headers: { origin: 'https://librosclub.vercel.app', 'x-forwarded-for': '198.51.100.7' },
    });
    assert.equal(res.statusCode, 502);
    assert.deepEqual(res.body, { message: 'No pudimos obtener la portada.' });
    assert.equal(fetcherCalls.length, 1);
    assert.deepEqual(fetcherCalls[0], [ALLOWED_COVER]);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /^gift-cover id=5 status=502 ms=\d+$/);
  });

  it('responde 200 con los bytes, el tipo, el largo y caché pública', async () => {
    const body = Buffer.alloc(10240, 1);
    fetcherResult = async () => ({ ok: true, contentType: 'image/jpeg', body });
    const res = await callCover('5', { query: { url: 'https://evil.example/x.png' }, body: { url: 'x' } });
    assert.equal(res.statusCode, 200);
    assert.equal(res.ended, body);
    assert.deepEqual(res.headers, {
      'Content-Type': 'image/jpeg',
      'Content-Length': '10240',
      'Cache-Control': 'public, max-age=86400',
    });
    assert.deepEqual(fetcherCalls, [[ALLOWED_COVER]]);
    assert.equal(warnings.length, 0);
  });

  it('propaga el error de la base a next vía asyncHandler', async () => {
    responder = () => { throw new Error('connection refused'); };
    await assert.rejects(callCover('5'), /connection refused/);
    const forwarded = await new Promise((resolve) => {
      asyncHandler(getCover)({ params: { id: '5' } }, fakeCoverRes(), resolve);
    });
    assert.match(forwarded.message, /connection refused/);
    assert.equal(fetcherCalls.length, 0);
  });

  it('exporta getRecommendations y getCover', () => {
    assert.deepEqual(Object.keys(require('../giftController')).sort(), ['getCover', 'getRecommendations']);
  });
});
