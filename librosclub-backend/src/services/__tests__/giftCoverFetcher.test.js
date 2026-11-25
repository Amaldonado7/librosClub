const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  fetchCoverImage,
  COVER_TIMEOUT_MS,
  COVER_MAX_BYTES,
  COVER_CONTENT_TYPES,
} = require('../giftCoverFetcher');

const COVER_URL = 'https://books.google.com/books/content?id=abc&printsec=frontcover&img=1';
const CHUNK = 64 * 1024;

function streamOf(totalBytes, chunkSize = CHUNK) {
  let sent = 0;
  const stats = { pulled: 0, cancelled: false };
  const stream = new ReadableStream({
    pull(controller) {
      if (sent >= totalBytes) {
        controller.close();
        return;
      }
      const size = Math.min(chunkSize, totalBytes - sent);
      sent += size;
      stats.pulled = sent;
      controller.enqueue(new Uint8Array(size).fill(7));
    },
    cancel() {
      stats.cancelled = true;
    },
  }, { highWaterMark: 0 });
  return { stream, stats };
}

function fakeResponse({ status = 200, headers = {}, body }) {
  return { status, headers: new Headers(headers), body };
}

function fakeFetch(responseFactory) {
  const calls = [];
  const impl = async (url, init) => {
    calls.push({ url, init });
    return responseFactory(url, init);
  };
  return { impl, calls };
}

describe('giftCoverFetcher constantes', () => {
  it('fija tiempo, tamaño y tipos permitidos', () => {
    assert.equal(COVER_TIMEOUT_MS, 2000);
    assert.equal(COVER_MAX_BYTES, 2097152);
    assert.deepEqual(COVER_CONTENT_TYPES, ['image/jpeg', 'image/png', 'image/webp']);
  });
});

describe('giftCoverFetcher.fetchCoverImage', () => {
  it('devuelve los bytes de una imagen jpeg de 10 KB y pide la URL tal cual sin seguir redirecciones', async () => {
    const { impl, calls } = fakeFetch(() => fakeResponse({
      headers: { 'Content-Type': 'image/jpeg', 'Content-Length': '10240' },
      body: streamOf(10240, 4096).stream,
    }));
    const result = await fetchCoverImage(COVER_URL, { fetchImpl: impl });
    assert.equal(result.ok, true);
    assert.equal(result.contentType, 'image/jpeg');
    assert.ok(Buffer.isBuffer(result.body));
    assert.equal(result.body.length, 10240);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, COVER_URL);
    assert.equal(calls[0].init.redirect, 'manual');
    assert.ok(calls[0].init.signal instanceof AbortSignal);
    assert.deepEqual(calls[0].init.headers, { Accept: 'image/jpeg,image/png,image/webp' });
  });

  for (const [header, expected] of [
    ['image/png', 'image/png'],
    ['image/webp; charset=binary', 'image/webp'],
    ['IMAGE/JPEG', 'image/jpeg'],
  ]) {
    it(`acepta Content-Type ${header}`, async () => {
      const { impl } = fakeFetch(() => fakeResponse({
        headers: { 'Content-Type': header },
        body: streamOf(100).stream,
      }));
      const result = await fetchCoverImage(COVER_URL, { fetchImpl: impl });
      assert.equal(result.ok, true);
      assert.equal(result.contentType, expected);
      assert.equal(result.body.length, 100);
    });
  }

  for (const headers of [{ 'Content-Type': 'text/html' }, { 'Content-Type': 'image/svg+xml' }, {}]) {
    it(`rechaza Content-Type ${headers['Content-Type'] ?? 'ausente'}`, async () => {
      const { impl } = fakeFetch(() => fakeResponse({ headers, body: streamOf(100).stream }));
      assert.deepEqual(await fetchCoverImage(COVER_URL, { fetchImpl: impl }), { ok: false });
    });
  }

  for (const status of [404, 302, 500]) {
    it(`rechaza status ${status}`, async () => {
      const { impl } = fakeFetch(() => fakeResponse({
        status,
        headers: { 'Content-Type': 'image/jpeg', Location: 'https://evil.example/x.jpg' },
        body: streamOf(100).stream,
      }));
      assert.deepEqual(await fetchCoverImage(COVER_URL, { fetchImpl: impl }), { ok: false });
    });
  }

  it('rechaza un Content-Length declarado mayor a 2 MB sin leer el cuerpo', async () => {
    let readerRequested = false;
    const body = { getReader() { readerRequested = true; return streamOf(10).stream.getReader(); } };
    const { impl } = fakeFetch(() => fakeResponse({
      headers: { 'Content-Type': 'image/jpeg', 'Content-Length': '3145728' },
      body,
    }));
    assert.deepEqual(await fetchCoverImage(COVER_URL, { fetchImpl: impl }), { ok: false });
    assert.equal(readerRequested, false);
  });

  it('corta la lectura de un cuerpo de 3 MB sin Content-Length al superar 2 MB', async () => {
    const { stream, stats } = streamOf(3 * 1024 * 1024);
    const { impl } = fakeFetch(() => fakeResponse({ headers: { 'Content-Type': 'image/jpeg' }, body: stream }));
    assert.deepEqual(await fetchCoverImage(COVER_URL, { fetchImpl: impl }), { ok: false });
    assert.ok(stats.pulled <= COVER_MAX_BYTES + CHUNK, `leídos ${stats.pulled}`);
    assert.equal(stats.cancelled, true);
  });

  it('acepta un cuerpo de exactamente maxBytes', async () => {
    const { impl } = fakeFetch(() => fakeResponse({
      headers: { 'Content-Type': 'image/png' },
      body: streamOf(1000, 100).stream,
    }));
    const result = await fetchCoverImage(COVER_URL, { fetchImpl: impl, maxBytes: 1000 });
    assert.equal(result.ok, true);
    assert.equal(result.body.length, 1000);
  });

  it('rechaza una respuesta sin cuerpo', async () => {
    const { impl } = fakeFetch(() => fakeResponse({ headers: { 'Content-Type': 'image/jpeg' }, body: null }));
    assert.deepEqual(await fetchCoverImage(COVER_URL, { fetchImpl: impl }), { ok: false });
  });

  it('corta por tiempo si Google nunca responde', async () => {
    let signalAborted = false;
    const impl = (_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => {
        signalAborted = true;
        reject(new DOMException('aborted', 'AbortError'));
      });
    });
    const start = Date.now();
    assert.deepEqual(await fetchCoverImage(COVER_URL, { fetchImpl: impl, timeoutMs: 50 }), { ok: false });
    assert.ok(Date.now() - start <= 250, `${Date.now() - start} ms`);
    assert.equal(signalAborted, true);
  });

  it('corta por tiempo aunque el fetch ignore la señal', async () => {
    const impl = () => new Promise(() => {});
    const start = Date.now();
    assert.deepEqual(await fetchCoverImage(COVER_URL, { fetchImpl: impl, timeoutMs: 50 }), { ok: false });
    assert.ok(Date.now() - start <= 250);
  });

  it('corta por tiempo si el cuerpo se cuelga a mitad de camino', async () => {
    let sent = false;
    const stream = new ReadableStream({
      pull(controller) {
        if (!sent) {
          sent = true;
          controller.enqueue(new Uint8Array(1024));
          return undefined;
        }
        return new Promise(() => {});
      },
    }, { highWaterMark: 0 });
    const { impl } = fakeFetch(() => fakeResponse({ headers: { 'Content-Type': 'image/jpeg' }, body: stream }));
    const start = Date.now();
    assert.deepEqual(await fetchCoverImage(COVER_URL, { fetchImpl: impl, timeoutMs: 50 }), { ok: false });
    assert.ok(Date.now() - start <= 250);
  });

  it('devuelve { ok: false } si el fetch lanza un error de red', async () => {
    const impl = async () => { throw new TypeError('fetch failed'); };
    assert.deepEqual(await fetchCoverImage(COVER_URL, { fetchImpl: impl }), { ok: false });
  });

  it('ignora un Content-Length no numérico y lee el cuerpo', async () => {
    const { impl } = fakeFetch(() => fakeResponse({
      headers: { 'Content-Type': 'image/jpeg', 'Content-Length': 'abc' },
      body: streamOf(10).stream,
    }));
    const result = await fetchCoverImage(COVER_URL, { fetchImpl: impl });
    assert.equal(result.ok, true);
  });
});

describe('runtime de Node', () => {
  it('package.json exige Node >= 20 sin dependencias nuevas', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', 'package.json'), 'utf8'));
    assert.equal(pkg.engines.node, '>=20');
    assert.deepEqual(Object.keys(pkg.dependencies).sort(), [
      'bcryptjs', 'body-parser', 'cors', 'dotenv', 'express', 'express-rate-limit', 'helmet', 'jsonwebtoken', 'node-fetch', 'pg',
    ]);
  });

  it('expone fetch y ReadableStream globales', () => {
    assert.equal(typeof globalThis.fetch, 'function');
    assert.equal(typeof ReadableStream, 'function');
  });
});
