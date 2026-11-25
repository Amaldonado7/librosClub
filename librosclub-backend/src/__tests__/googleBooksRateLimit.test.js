const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const TEST_KEY = 'fake-test-key-ratelimit';
process.env.GOOGLE_BOOKS_API_KEY = TEST_KEY;

const realFetch = globalThis.fetch;
const googleCalls = [];

async function googleStub(url, options = {}) {
  const target = new URL(String(url));
  if (target.host !== 'www.googleapis.com') {
    throw new Error(`request inesperado fuera de Google: ${target.host}`);
  }
  googleCalls.push({ url: target, headers: options.headers ?? {} });
  return { ok: true, status: 200, text: async () => JSON.stringify({ totalItems: 0, items: [] }) };
}

globalThis.fetch = googleStub;

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

const GENERIC_MESSAGE = { message: 'Demasiadas solicitudes. Probá de nuevo en unos minutos.' };

let server;
let baseUrl;
let ipCounter = 0;
let queryCounter = 0;

function nextIp() {
  ipCounter += 1;
  return `198.51.100.${ipCounter}`;
}

function search(ip) {
  queryCounter += 1;
  return realFetch(`${baseUrl}/api/google-books/search?q=libro-${queryCounter}`, {
    headers: { 'X-Forwarded-For': ip },
  });
}

function feed(ip) {
  queryCounter += 1;
  return realFetch(`${baseUrl}/api/google-books/feed?topic=tema-${queryCounter}`, {
    headers: { 'X-Forwarded-For': ip },
  });
}

function recommend(ip) {
  return realFetch(`${baseUrl}/api/gift/recommendations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
    body: JSON.stringify({}),
  });
}

async function exhaust(ip) {
  for (let i = 0; i < 60; i += 1) {
    const res = await search(ip);
    assert.equal(res.status, 200, `pedido ${i + 1}`);
    await res.text();
  }
}

before(async () => {
  assert.equal(globalThis.fetch, googleStub);
  assert.equal(typeof realFetch, 'function');
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  globalThis.fetch = realFetch;
});

describe('rate limit de /api/google-books', () => {
  it('devuelve 429 con mensaje genérico y headers RateLimit-* en el pedido 61', async () => {
    const ip = nextIp();
    await exhaust(ip);

    const blocked = await search(ip);
    assert.equal(blocked.status, 429);
    assert.deepEqual(await blocked.json(), GENERIC_MESSAGE);
    assert.equal(blocked.headers.get('ratelimit-limit'), '60');
    assert.equal(blocked.headers.get('ratelimit-remaining'), '0');
    assert.ok(blocked.headers.get('ratelimit-reset'));
    assert.equal(blocked.headers.get('x-ratelimit-limit'), null);

    const blockedFeed = await feed(ip);
    assert.equal(blockedFeed.status, 429);
    await blockedFeed.text();

    const other = await search(nextIp());
    assert.equal(other.status, 200);
    await other.text();
  });

  it('agotar Google Books no consume el límite de /api/gift/recommendations', async () => {
    const ip = nextIp();
    await exhaust(ip);
    const blocked = await search(ip);
    assert.equal(blocked.status, 429);
    await blocked.text();

    const gift = await recommend(ip);
    assert.notEqual(gift.status, 429);
    assert.equal(gift.headers.get('ratelimit-limit'), '30');
    assert.equal(gift.headers.get('ratelimit-remaining'), '29');
    await gift.text();
  });

  it('las requests a Google llevan la key solo en el header X-Goog-Api-Key', async () => {
    assert.ok(googleCalls.length > 0);
    googleCalls.forEach(({ url, headers }) => {
      assert.equal(url.searchParams.has('key'), false);
      assert.equal(url.toString().includes(TEST_KEY), false);
      assert.equal(headers['X-Goog-Api-Key'], TEST_KEY);
    });
  });
});
