const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

process.env.CORS_ORIGINS = 'https://librosclub.vercel.app';

const COVER_5 = 'https://books.google.com/books/content?id=five&printsec=frontcover&img=1';
const IMAGE_10KB = Buffer.alloc(10240, 9);

const BOOKS = [
  { id: 5, coverUrl: COVER_5, active: true },
  { id: 6, coverUrl: 'https://books.google.com/books/content?id=six', active: false },
  { id: 7, coverUrl: null, active: true },
  { id: 8, coverUrl: 'http://169.254.169.254/latest', active: true },
  { id: 9, coverUrl: 'https://evil.example/x.jpg', active: true },
  { id: 10, coverUrl: 'https://books.google.com:8443/x', active: true },
];

const dbPath = require.resolve(path.join(__dirname, '..', 'config', 'db'));
let failQueries = false;
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: {
    query: async (sql, params) => {
      if (failQueries) throw new Error('relation "gift_books" does not exist');
      if (sql.includes('WHERE id = $1')) {
        const book = BOOKS.find((b) => b.id === params[0] && b.active);
        return { rows: book ? [{ coverUrl: book.coverUrl }] : [] };
      }
      return { rows: [] };
    },
  },
};

const realFetch = globalThis.fetch;
const outbound = [];
let google = () => new Response(IMAGE_10KB, { status: 200, headers: { 'Content-Type': 'image/jpeg' } });

function hangUntilAborted(init) {
  return new Promise((_resolve, reject) => {
    init.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
  });
}

globalThis.fetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? input : input.url ?? String(input);
  if (url.startsWith('http://127.0.0.1')) return realFetch(input, init);
  outbound.push(url);
  return google(url, init);
};

const app = require('../app');

let server;
let port;
let ipCounter = 0;

function nextIp() {
  ipCounter += 1;
  return `198.51.100.${ipCounter}`;
}

function request({ method = 'GET', urlPath, headers = {}, body }) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, method, path: urlPath, headers }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    if (body !== undefined) req.write(body);
    req.end();
  });
}

function getCover(id, { ip = nextIp(), headers = {}, query = '', body } = {}) {
  return request({ urlPath: `/api/gift/covers/${id}${query}`, headers: { 'X-Forwarded-For': ip, ...headers }, body });
}

function jsonOf(res) {
  return JSON.parse(res.body.toString('utf8'));
}

function assertSafeErrorBody(res) {
  const text = res.body.toString('utf8');
  assert.equal(text.toLowerCase().includes('http'), false, text);
  assert.equal(text.toLowerCase().includes('google'), false, text);
  assert.equal(/\bat [\w.<>]+ \(/.test(text), false, text);
}

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  port = server.address().port;
});

after(async () => {
  globalThis.fetch = realFetch;
  await new Promise((resolve) => server.close(resolve));
});

beforeEach(() => {
  outbound.length = 0;
  failQueries = false;
  google = () => new Response(IMAGE_10KB, { status: 200, headers: { 'Content-Type': 'image/jpeg' } });
});

describe('GET /api/gift/covers/:id', () => {
  it('devuelve la portada de Google con tipo, bytes y caché pública', async () => {
    const res = await getCover(5);
    assert.equal(res.status, 200);
    assert.equal(res.headers['content-type'], 'image/jpeg');
    assert.equal(res.headers['content-length'], '10240');
    assert.equal(res.headers['cache-control'], 'public, max-age=86400');
    assert.deepEqual(res.body, IMAGE_10KB);
    assert.deepEqual(outbound, [COVER_5]);
  });

  it('ignora la query string: el único pedido saliente es la cover_url de la base', async () => {
    const res = await getCover(5, { query: '?url=https://evil.example/x.png' });
    assert.equal(res.status, 200);
    assert.deepEqual(outbound, [COVER_5]);
  });

  for (const id of [8, 9, 10]) {
    it(`responde 404 sin pedidos salientes si la cover_url del libro ${id} está fuera de la allowlist`, async () => {
      const res = await getCover(id);
      assert.equal(res.status, 404);
      assert.deepEqual(jsonOf(res), { message: 'Portada no disponible.' });
      assert.equal(outbound.length, 0);
    });
  }

  for (const [name, factory] of [
    ['text/html', () => new Response('<h1>x</h1>', { status: 200, headers: { 'Content-Type': 'text/html' } })],
    ['image/svg+xml', () => new Response('<svg/>', { status: 200, headers: { 'Content-Type': 'image/svg+xml' } })],
    ['status 404', () => new Response('no', { status: 404, headers: { 'Content-Type': 'image/jpeg' } })],
  ]) {
    it(`responde 502 si Google devuelve ${name}`, async () => {
      google = factory;
      const res = await getCover(5);
      assert.equal(res.status, 502);
      assert.deepEqual(jsonOf(res), { message: 'No pudimos obtener la portada.' });
      assert.equal(res.headers['cache-control'], 'no-store');
    });
  }

  it('responde 502 en menos de 2500 ms si Google nunca responde', async () => {
    google = (_url, init) => hangUntilAborted(init);
    const start = Date.now();
    const res = await getCover(5);
    const elapsed = Date.now() - start;
    assert.equal(res.status, 502);
    assert.ok(elapsed <= 2500, `${elapsed} ms`);
  });

  it('responde 502 con el JSON de error si la imagen supera 2 MB', async () => {
    google = () => new Response(new Uint8Array(3 * 1024 * 1024), { status: 200, headers: { 'Content-Type': 'image/jpeg' } });
    const res = await getCover(5);
    assert.equal(res.status, 502);
    assert.equal(res.headers['content-type'].startsWith('application/json'), true);
    assert.deepEqual(jsonOf(res), { message: 'No pudimos obtener la portada.' });
  });

  it('responde 500 genérico con no-store ante un error de base', async () => {
    failQueries = true;
    const originalError = console.error;
    console.error = () => {};
    try {
      const res = await getCover(5);
      assert.equal(res.status, 500);
      assert.deepEqual(jsonOf(res), { message: 'Error del servidor.' });
      assert.equal(res.headers['cache-control'], 'no-store');
      assertSafeErrorBody(res);
    } finally {
      console.error = originalError;
    }
  });

  for (const id of ['abc', '0', '-1', '1.5', '99999999999']) {
    it(`responde 400 con no-store a id ${id}`, async () => {
      const res = await getCover(id);
      assert.equal(res.status, 400);
      assert.deepEqual(jsonOf(res), { message: 'Solicitud inválida.' });
      assert.equal(res.headers['cache-control'], 'no-store');
      assertSafeErrorBody(res);
      assert.equal(outbound.length, 0);
    });
  }

  for (const id of [999, 6, 7]) {
    it(`responde 404 con no-store al libro ${id} (inexistente, inactivo o sin portada)`, async () => {
      const res = await getCover(id);
      assert.equal(res.status, 404);
      assert.deepEqual(jsonOf(res), { message: 'Portada no disponible.' });
      assert.equal(res.headers['cache-control'], 'no-store');
      assertSafeErrorBody(res);
      assert.equal(outbound.length, 0);
    });
  }

  it('limita a 60 pedidos por IP sin afectar a /recommendations', async () => {
    const ip = nextIp();
    for (let i = 0; i < 60; i += 1) {
      const res = await getCover(5, { ip });
      assert.notEqual(res.status, 429, `pedido ${i + 1}`);
    }
    const blocked = await getCover(5, { ip });
    assert.equal(blocked.status, 429);
    assert.deepEqual(jsonOf(blocked), { message: 'Demasiadas solicitudes. Probá de nuevo en unos minutos.' });
    assert.equal(blocked.headers['cache-control'], 'no-store');
    const recommendations = await request({
      method: 'POST',
      urlPath: '/api/gift/recommendations',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
      body: JSON.stringify({}),
    });
    assert.notEqual(recommendations.status, 429);
  });

  it('acepta el origen permitido y rechaza otro con 403 y no-store', async () => {
    const allowed = await getCover(5, { headers: { Origin: 'https://librosclub.vercel.app' } });
    assert.equal(allowed.status, 200);
    assert.equal(allowed.headers['access-control-allow-origin'], 'https://librosclub.vercel.app');
    const rejected = await getCover(5, { headers: { Origin: 'https://evil.example' } });
    assert.equal(rejected.status, 403);
    assert.deepEqual(jsonOf(rejected), { message: 'Origen no permitido.' });
    assert.equal(rejected.headers['cache-control'], 'no-store');
  });

  it('no parsea el cuerpo del GET', async () => {
    const cases = [
      { 'Content-Type': 'application/json', body: JSON.stringify({ filler: 'x'.repeat(3072) }) },
      { 'Content-Type': 'application/json', body: '{"relationship":' },
      { 'Content-Type': 'application/x-www-form-urlencoded', body: `a=${'x'.repeat(3070)}` },
    ];
    for (const { body, ...headers } of cases) {
      outbound.length = 0;
      const res = await getCover(5, { headers: { ...headers, 'Content-Length': String(Buffer.byteLength(body)) }, body });
      assert.equal(res.status, 200, headers['Content-Type']);
      assert.deepEqual(outbound, [COVER_5]);
    }
  });

  it('mantiene los límites de /recommendations', async () => {
    const post = (body, contentType) => request({
      method: 'POST',
      urlPath: '/api/gift/recommendations',
      headers: { 'Content-Type': contentType, 'X-Forwarded-For': nextIp() },
      body,
    });
    const tooLarge = await post(JSON.stringify({ filler: 'x'.repeat(3072) }), 'application/json');
    assert.equal(tooLarge.status, 413);
    const tooLargeForm = await post(`a=${'x'.repeat(3070)}`, 'application/x-www-form-urlencoded');
    assert.equal(tooLargeForm.status, 413);
    const malformed = await post('{"relationship":', 'application/json');
    assert.equal(malformed.status, 400);
    assert.deepEqual(jsonOf(malformed), { message: 'JSON inválido.' });
  });

  it('conserva CORP same-origin, nosniff y la CSP en la respuesta 200', async () => {
    const res = await getCover(5);
    assert.equal(res.status, 200);
    assert.equal(res.headers['cross-origin-resource-policy'], 'same-origin');
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.ok(res.headers['content-security-policy'].includes("default-src 'self'"));
  });

  it('no registra IP, headers ni URL y no escribe en disco', async () => {
    const lines = [];
    const methods = ['log', 'info', 'warn', 'error'];
    const originals = Object.fromEntries(methods.map((m) => [m, console[m]]));
    for (const m of methods) console[m] = (...args) => { lines.push(args.map(String).join(' ')); };
    const writes = [];
    const fsOriginals = {
      writeFile: fs.writeFile,
      writeFileSync: fs.writeFileSync,
      createWriteStream: fs.createWriteStream,
      promisesWriteFile: fs.promises.writeFile,
    };
    fs.writeFile = (...args) => { writes.push('writeFile'); return fsOriginals.writeFile(...args); };
    fs.writeFileSync = (...args) => { writes.push('writeFileSync'); return fsOriginals.writeFileSync(...args); };
    fs.createWriteStream = (...args) => { writes.push('createWriteStream'); return fsOriginals.createWriteStream(...args); };
    fs.promises.writeFile = (...args) => { writes.push('promises.writeFile'); return fsOriginals.promisesWriteFile(...args); };
    const ip = nextIp();
    const headers = { Origin: 'https://librosclub.vercel.app', 'User-Agent': 'agente-de-prueba' };
    try {
      const ok = await getCover(5, { ip, headers });
      assert.equal(ok.status, 200);
      google = () => new Response('<h1>x</h1>', { status: 200, headers: { 'Content-Type': 'text/html' } });
      const failed = await getCover(5, { ip, headers });
      assert.equal(failed.status, 502);
    } finally {
      for (const m of methods) console[m] = originals[m];
      fs.writeFile = fsOriginals.writeFile;
      fs.writeFileSync = fsOriginals.writeFileSync;
      fs.createWriteStream = fsOriginals.createWriteStream;
      fs.promises.writeFile = fsOriginals.promisesWriteFile;
    }
    assert.equal(lines.length, 1);
    for (const line of lines) {
      assert.equal(line.includes(ip), false);
      assert.equal(line.toLowerCase().includes('origin'), false);
      assert.equal(line.toLowerCase().includes('user-agent'), false);
      assert.equal(line.includes('agente-de-prueba'), false);
      assert.equal(line.includes(COVER_5), false);
      assert.equal(line.includes('books.google'), false);
    }
    assert.deepEqual(writes, []);
  });
});
