const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret';

const dbPath = require.resolve(path.join(__dirname, '..', 'config', 'db'));
const queries = [];
let failQueries = false;
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: {
    query: async (sql, params) => {
      queries.push({ sql, params });
      if (failQueries) throw new Error('db caída');
      return { rows: [] };
    },
  },
};

const app = require('../app');

const token = jwt.sign({ userId: 1, username: 'ana', role: 'user', plan: 'free' }, 'test-secret', { expiresIn: '1h' });
const auth = { Authorization: `Bearer ${token}` };

let server;
let baseUrl;

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
});

async function healthOk() {
  const res = await fetch(`${baseUrl}/api/health`);
  return res.status === 200;
}

function assertNoStack(text) {
  assert.equal(/\bat [\w.<>]+ \(/.test(text), false);
  assert.equal(text.includes('node_modules'), false);
  assert.equal(text.includes(__dirname.split(path.sep).slice(0, 3).join('/')), false);
}

describe('clubs: parámetros de ruta no numéricos', () => {
  for (const [method, route] of [
    ['GET', '/api/clubs/abc'],
    ['POST', '/api/clubs/abc/join'],
    ['PUT', '/api/clubs/1e3/current-book'],
    ['DELETE', '/api/clubs/1/meetings/x'],
    ['DELETE', '/api/clubs/1/posts/-2'],
  ]) {
    it(`debe responder 400 a ${method} ${route} sin consultar la base`, async () => {
      const res = await fetch(`${baseUrl}${route}`, { method, headers: { ...auth, 'Content-Type': 'application/json' }, body: method === 'GET' ? undefined : '{}' });
      assert.equal(res.status, 400);
      assert.deepEqual(await res.json(), { message: 'Identificador inválido.' });
      assert.equal(queries.length, 0);
      assert.equal(await healthOk(), true);
    });
  }
});

describe('clubs: error de base fuera del try del handler', () => {
  it('debe responder 500 genérico y el proceso sigue vivo', async () => {
    failQueries = true;
    const res = await fetch(`${baseUrl}/api/clubs/5`, { headers: auth });
    assert.equal(res.status, 500);
    const text = await res.text();
    assert.deepEqual(JSON.parse(text), { message: 'Error del servidor.' });
    assertNoStack(text);
    failQueries = false;
    assert.equal(await healthOk(), true);
  });
});

describe('app: manejador de errores', () => {
  it('debe responder 400 JSON sin stack ante un body JSON malformado', async () => {
    const res = await fetch(`${baseUrl}/api/clubs`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: '{"nombre": ',
    });
    assert.equal(res.status, 400);
    assert.match(res.headers.get('content-type'), /application\/json/);
    const text = await res.text();
    assert.deepEqual(JSON.parse(text), { message: 'JSON inválido.' });
    assertNoStack(text);
  });

  it('debe responder 403 JSON sin stack a un origin no permitido', async () => {
    const res = await fetch(`${baseUrl}/api/health`, { headers: { Origin: 'https://evil.example.com' } });
    assert.equal(res.status, 403);
    const text = await res.text();
    assert.deepEqual(JSON.parse(text), { message: 'Origen no permitido.' });
    assertNoStack(text);
    assert.equal(res.headers.get('access-control-allow-origin'), null);
  });

  it('debe seguir permitiendo el origin local', async () => {
    const res = await fetch(`${baseUrl}/api/health`, { headers: { Origin: 'http://localhost:8080' } });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('access-control-allow-origin'), 'http://localhost:8080');
  });
});
