const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

process.env.GOOGLE_BOOKS_API_KEY = 'test-key';

const calls = [];
const okResponse = (body) => ({ ok: true, status: 200, text: async () => JSON.stringify(body) });
let responder = () => okResponse({ items: [] });

const fetchPath = require.resolve('node-fetch');
require.cache[fetchPath] = {
  id: fetchPath,
  filename: fetchPath,
  loaded: true,
  exports: async (url) => {
    calls.push(new URL(url));
    return responder(url);
  },
};

const { getGoogleFeed } = require('../googleBooksService');

const volume = (id, publishedDate) => ({
  id,
  volumeInfo: { title: `Libro ${id}`, authors: ['Autor'], publishedDate },
});

beforeEach(() => {
  calls.length = 0;
  responder = () => okResponse({ items: [] });
});

describe('googleBooksService.getGoogleFeed', () => {
  it('arma la URL del feed sin orderBy y con los parámetros saneados', async () => {
    await getGoogleFeed({ topic: 'fantasy', limit: 10, lang: 'es', page: 2 });

    assert.equal(calls.length, 1);
    const params = calls[0].searchParams;
    assert.equal(params.get('q'), 'subject:fantasy');
    assert.equal(params.get('maxResults'), '10');
    assert.equal(params.get('startIndex'), '20');
    assert.equal(params.get('langRestrict'), 'es');
    assert.equal(params.get('printType'), 'books');
    assert.equal(params.get('key'), 'test-key');
    assert.equal(params.has('orderBy'), false);
  });

  it('ordena por fecha de publicación descendente con nulos al final', async () => {
    responder = () =>
      okResponse({
        items: [volume('a', '2001'), volume('b', '2019-05'), volume('c', null), volume('d', '2019-05-20')],
      });

    const result = await getGoogleFeed({ topic: 'fiction', limit: 10, lang: 'es', page: 0 });

    assert.deepEqual(
      result.items.map((item) => item.publishedDate),
      ['2019-05-20', '2019-05', '2001', null],
    );
    result.items.forEach((item) => assert.equal('_publishedDateNormalized' in item, false));
    assert.deepEqual(
      { topic: result.topic, limit: result.limit, page: result.page },
      { topic: 'fiction', limit: 10, page: 0 },
    );
  });

  it('propaga el status cuando Google Books responde con error', async () => {
    responder = () => ({ ok: false, status: 503, text: async () => 'Service Unavailable' });

    await assert.rejects(
      getGoogleFeed({ topic: 'fiction', limit: 10, lang: 'es', page: 0 }),
      (err) => err.status === 503,
    );
  });

  it('acota limit a 40 y page a 0 como mínimo', async () => {
    await getGoogleFeed({ topic: 'fiction', limit: 999, lang: 'es', page: -3 });

    const params = calls[0].searchParams;
    assert.equal(params.get('maxResults'), '40');
    assert.equal(params.get('startIndex'), '0');
  });
});
