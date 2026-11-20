const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const dbPath = require.resolve(path.join(__dirname, '..', 'config', 'db'));
const queries = [];
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: {
    query: async (sql, params) => {
      queries.push({ sql, params });
      return { rows: [] };
    },
  },
};

const app = require('../app');

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

function post(route, body) {
  return fetch(`${baseUrl}${route}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('app: rutas legadas de /api/users', () => {
  it('debe responder 404 a POST /api/users/register aunque se envíe role admin', async () => {
    queries.length = 0;
    const res = await post('/api/users/register', { username: 'intruso', password: '123456', role: 'admin' });
    assert.equal(res.status, 404);
    assert.equal(queries.some((q) => /INSERT/i.test(q.sql)), false);
  });

  it('debe responder 404 a POST /api/users/login', async () => {
    queries.length = 0;
    const res = await post('/api/users/login', { username: 'intruso', password: '123456' });
    assert.equal(res.status, 404);
    assert.equal(queries.length, 0);
  });

  it('debe seguir exponiendo /api/health', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { status: 'ok' });
  });
});
