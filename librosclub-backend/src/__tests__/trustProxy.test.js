const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const dbPath = require.resolve(path.join(__dirname, '..', 'config', 'db'));
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: {
    query: async () => ({ rows: [] }),
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

function login(forwardedFor) {
  return fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': forwardedFor },
    body: JSON.stringify({ username: 'nadie', password: 'incorrecta' }),
  });
}

describe('app: trust proxy y loginLimiter por cliente', () => {
  it('debe configurar trust proxy con un salto', () => {
    assert.equal(app.get('trust proxy'), 1);
  });

  it('debe limitar a un cliente sin bloquear a otro detrás del mismo proxy', async () => {
    for (let i = 0; i < 10; i += 1) {
      const res = await login('203.0.113.10');
      assert.equal(res.status, 401);
    }

    const blocked = await login('203.0.113.10');
    assert.equal(blocked.status, 429);
    assert.deepEqual(await blocked.json(), { message: 'Demasiados intentos. Intentá de nuevo en 15 minutos.' });

    const other = await login('198.51.100.20');
    assert.equal(other.status, 401);
  });
});
