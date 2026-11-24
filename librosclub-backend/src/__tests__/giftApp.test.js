const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { performance } = require('node:perf_hooks');

const AGES = ['joven', 'adulto'];
const HOOKS = ['amor', 'misterio', 'humor', 'anime_manga'];
const KINDS = ['novela', 'historia_real', 'aprender', 'poesia'];
const TONES = ['liviano', 'emotivo', 'intenso'];
const LEVELS = ['casi_nunca', 'vacaciones', 'mensual', 'devora'];
const LENGTHS = ['corto', 'mediano', 'largo'];

function buildCatalog(size) {
  return Array.from({ length: size }, (_, i) => ({
    id: i + 1,
    title: `Libro ${i + 1}`,
    author: `Autor ${i + 1}`,
    coverUrl: null,
    coverColor: '#5E5827',
    genreLabel: 'Género',
    why: 'Porque sí.',
    dedication: 'Para vos.',
    shareQuote: 'Una frase.',
    ageRanges: [AGES[i % AGES.length]],
    readingLevels: [LEVELS[i % LEVELS.length]],
    hooks: [HOOKS[i % HOOKS.length]],
    kinds: [KINDS[(i >> 2) % KINDS.length]],
    length: LENGTHS[i % LENGTHS.length],
    tones: [TONES[i % TONES.length]],
    active: true,
  }));
}

const dbPath = require.resolve(path.join(__dirname, '..', 'config', 'db'));
const queries = [];
let catalog = buildCatalog(20);
let failQueries = false;
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: {
    query: async (sql, params) => {
      queries.push({ sql, params });
      if (failQueries) throw new Error('relation "gift_books" does not exist');
      if (sql.includes('public.gift_books')) {
        const [ages] = params;
        return { rows: catalog.filter((book) => book.ageRanges.some((age) => ages.includes(age))) };
      }
      return { rows: [] };
    },
  },
};

const app = require('../app');

const ANSWERS = Object.freeze({
  relationship: 'mama',
  occasion: 'navidad',
  age: 'adulto',
  readingLevel: 'vacaciones',
  hook: 'humor',
  kind: 'novela',
  length: 'corto',
  tone: 'liviano',
});

let server;
let baseUrl;
let ipCounter = 0;

function nextIp() {
  ipCounter += 1;
  return `203.0.113.${ipCounter}`;
}

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

beforeEach(() => {
  queries.length = 0;
  failQueries = false;
  catalog = buildCatalog(20);
});

function recommend(ip, body = JSON.stringify(ANSWERS), contentType = 'application/json') {
  return fetch(`${baseUrl}/api/gift/recommendations`, {
    method: 'POST',
    headers: { 'Content-Type': contentType, 'X-Forwarded-For': ip },
    body,
  });
}

function assertNoStack(text) {
  assert.equal(/\bat [\w.<>]+ \(/.test(text), false);
  assert.equal(text.includes('node_modules'), false);
  assert.equal(text.includes(__dirname.split(path.sep).slice(0, 3).join('/')), false);
}

function paddedBody(totalBytes) {
  const base = JSON.stringify({ ...ANSWERS, filler: '' });
  const filler = 'x'.repeat(totalBytes - Buffer.byteLength(base));
  const body = JSON.stringify({ ...ANSWERS, filler });
  assert.equal(Buffer.byteLength(body), totalBytes);
  return body;
}

describe('POST /api/gift/recommendations', () => {
  it('responde 200 sin token con 3 libros', async () => {
    const res = await recommend(nextIp());
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body.profile, { relationship: 'mama', occasion: 'navidad' });
    assert.equal(body.books.length, 3);
    assert.ok(body.books.every((book) => book.buyUrl.startsWith('https://www.buscalibre.com.ar/')));
  });

  it('responde 400 con el campo faltante', async () => {
    const body = { ...ANSWERS };
    delete body.age;
    const res = await recommend(nextIp(), JSON.stringify(body));
    assert.equal(res.status, 400);
    assert.deepEqual(await res.json(), { message: 'Falta la respuesta: age.' });
    assert.equal(queries.length, 0);
  });

  it('responde 400 a una edad fuera de joven y adulto', async () => {
    const res = await recommend(nextIp(), JSON.stringify({ ...ANSWERS, age: 'mayor' }));
    assert.equal(res.status, 400);
    assert.deepEqual(await res.json(), { message: 'Respuesta inválida: age.' });
    assert.equal(queries.length, 0);
  });

  it('responde 413 a un cuerpo JSON de 3 KB sin consultar la base', async () => {
    const res = await recommend(nextIp(), paddedBody(3072));
    assert.equal(res.status, 413);
    assert.deepEqual(await res.json(), { message: 'El pedido es demasiado grande.' });
    assert.equal(queries.length, 0);
  });

  it('acepta un cuerpo de exactamente 2048 bytes', async () => {
    const res = await recommend(nextIp(), paddedBody(2048));
    assert.equal(res.status, 200);
  });

  it('responde 413 a un cuerpo urlencoded de 3 KB', async () => {
    const res = await recommend(nextIp(), `a=${'x'.repeat(3070)}`, 'application/x-www-form-urlencoded');
    assert.equal(res.status, 413);
    assert.deepEqual(await res.json(), { message: 'El pedido es demasiado grande.' });
    assert.equal(queries.length, 0);
  });

  it('responde 400 a un JSON malformado', async () => {
    const res = await recommend(nextIp(), '{"relationship":');
    assert.equal(res.status, 400);
    assert.deepEqual(await res.json(), { message: 'JSON inválido.' });
  });

  it('limita a 30 pedidos por IP sin afectar a otra IP ni al login', async () => {
    const ipA = nextIp();
    for (let i = 0; i < 30; i += 1) {
      const res = await recommend(ipA);
      assert.equal(res.status, 200, `pedido ${i + 1}`);
    }
    const blocked = await recommend(ipA);
    assert.equal(blocked.status, 429);
    assert.deepEqual(await blocked.json(), { message: 'Demasiadas solicitudes. Probá de nuevo en unos minutos.' });

    const other = await recommend(nextIp());
    assert.equal(other.status, 200);

    const login = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ipA },
      body: JSON.stringify({ username: 'nadie', password: 'x' }),
    });
    assert.notEqual(login.status, 429);
  });

  it('responde 500 genérico ante un error de base y el proceso sigue vivo', async () => {
    failQueries = true;
    const res = await recommend(nextIp());
    assert.equal(res.status, 500);
    const text = await res.text();
    assert.deepEqual(JSON.parse(text), { message: 'Error del servidor.' });
    assert.equal(text.includes('gift_books'), false);
    assert.equal(text.includes('relation'), false);
    assertNoStack(text);
    failQueries = false;
    const health = await fetch(`${baseUrl}/api/health`);
    assert.equal(health.status, 200);
  });

  it('mantiene p95 por debajo de 300 ms con 200 libros activos', async () => {
    catalog = buildCatalog(200);
    const durations = [];
    let ip = nextIp();
    for (let i = 0; i < 100; i += 1) {
      if (i > 0 && i % 25 === 0) ip = nextIp();
      const answers = {
        ...ANSWERS,
        age: AGES[i % AGES.length],
        hook: HOOKS[i % HOOKS.length],
        kind: KINDS[(i >> 1) % KINDS.length],
        tone: TONES[i % TONES.length],
      };
      const start = performance.now();
      const res = await recommend(ip, JSON.stringify(answers));
      await res.arrayBuffer();
      durations.push(performance.now() - start);
      assert.equal(res.status, 200);
    }
    durations.sort((a, b) => a - b);
    const p95 = durations[Math.ceil(durations.length * 0.95) - 1];
    assert.ok(p95 < 300, `p95 = ${p95.toFixed(1)} ms`);
  });
});
