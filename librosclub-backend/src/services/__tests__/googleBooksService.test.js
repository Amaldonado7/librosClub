const { describe, it, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');

process.env.GOOGLE_BOOKS_API_KEY = 'test-key';

const calls = [];
const okResponse = (body) => ({ ok: true, status: 200, text: async () => JSON.stringify(body) });
let responder = () => okResponse({ items: [] });

const headers = [];

const originalFetch = globalThis.fetch;
const fetchStub = async (url, options = {}) => {
  calls.push(new URL(url));
  headers.push(options.headers ?? {});
  return responder(url);
};
globalThis.fetch = fetchStub;

after(() => {
  globalThis.fetch = originalFetch;
});

const assertKeyOnlyInHeader = () => {
  assert.equal(calls.length, 1);
  assert.equal(calls[0].searchParams.has('key'), false);
  assert.equal(calls[0].toString().includes('key='), false);
  assert.equal(calls[0].toString().includes('test-key'), false);
  assert.equal(headers[0]['X-Goog-Api-Key'], 'test-key');
};

const { getGoogleFeed, searchVolumes } = require('../googleBooksService');

const volume = (id, publishedDate) => ({
  id,
  volumeInfo: { title: `Libro ${id}`, authors: ['Autor'], publishedDate },
});

beforeEach(() => {
  assert.equal(globalThis.fetch, fetchStub);
  calls.length = 0;
  headers.length = 0;
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
    assert.equal(params.has('orderBy'), false);
  });

  it('manda la key solo en el header X-Goog-Api-Key', async () => {
    await getGoogleFeed({ topic: 'fiction', limit: 10, lang: 'es', page: 0 });

    assertKeyOnlyInHeader();
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

  it('lanza un error con status 500 cuando Google responde 500 con body de texto', async () => {
    responder = () => ({ ok: false, status: 500, text: async () => 'Internal Server Error' });

    await assert.rejects(
      getGoogleFeed({ topic: 'fiction', limit: 10, lang: 'es', page: 0 }),
      (err) => err instanceof Error && err.status === 500,
    );
  });

  it('lanza un error cuando la respuesta no es JSON válido', async () => {
    responder = () => ({ ok: true, status: 200, text: async () => '<html>no json</html>' });

    await assert.rejects(getGoogleFeed({ topic: 'fiction', limit: 10, lang: 'es', page: 0 }));
  });

  it('no expone la URL ni la key cuando falla la red', async () => {
    responder = (url) => {
      throw new TypeError(`fetch failed ${url}`, { cause: new Error(`connect ECONNREFUSED ${url}`) });
    };

    await assert.rejects(getGoogleFeed({ topic: 'fiction', limit: 10, lang: 'es', page: 0 }), (err) => {
      const texts = [err.message, String(err.cause ?? ''), err.cause?.message ?? ''];
      texts.forEach((text) => {
        assert.equal(text.includes('test-key'), false);
        assert.equal(text.includes('googleapis.com'), false);
      });
      assert.equal(err.status, undefined);
      return true;
    });
  });

  it('acota limit a 40 y page a 0 como mínimo', async () => {
    await getGoogleFeed({ topic: 'fiction', limit: 999, lang: 'es', page: -3 });

    const params = calls[0].searchParams;
    assert.equal(params.get('maxResults'), '40');
    assert.equal(params.get('startIndex'), '0');
  });
});

describe('googleBooksService.searchVolumes', () => {
  it('manda la key solo en el header X-Goog-Api-Key', async () => {
    await searchVolumes({ q: 'rayuela', page: 0, pageSize: 20, lang: 'es' });

    assertKeyOnlyInHeader();
  });

  it('propaga el status cuando Google Books responde con error', async () => {
    responder = () => ({ ok: false, status: 403, text: async () => 'Forbidden' });

    await assert.rejects(searchVolumes({ q: 'rayuela' }), (err) => err.status === 403);
  });

  it('lanza un error cuando la respuesta no es JSON válido', async () => {
    responder = () => ({ ok: true, status: 200, text: async () => '<html>no json</html>' });

    await assert.rejects(searchVolumes({ q: 'rayuela' }));
  });

  it('no expone la URL ni la key cuando falla la red', async () => {
    responder = (url) => {
      throw new TypeError(`fetch failed ${url}`, { cause: new Error(`connect ECONNREFUSED ${url}`) });
    };

    await assert.rejects(searchVolumes({ q: 'rayuela' }), (err) => {
      [err.message, String(err.cause ?? '')].forEach((text) => {
        assert.equal(text.includes('test-key'), false);
        assert.equal(text.includes('googleapis.com'), false);
      });
      assert.equal(err.cause, undefined);
      return true;
    });
  });

  it('devuelve el shape esperado con los campos de cada volumen', async () => {
    responder = () =>
      okResponse({
        totalItems: 1,
        items: [
          {
            id: 'v1',
            volumeInfo: {
              title: 'Rayuela',
              authors: ['Julio Cortázar'],
              publishedDate: '1963',
              imageLinks: { thumbnail: 'https://books.google.com/thumb.jpg' },
              infoLink: 'https://books.google.com/info',
            },
          },
        ],
      });

    const result = await searchVolumes({ q: 'rayuela', page: 1, pageSize: 5, lang: 'es' });

    assert.equal(calls[0].searchParams.get('q'), 'rayuela');
    assert.equal(calls[0].searchParams.get('startIndex'), '5');
    assert.deepEqual(result, {
      q: 'rayuela',
      page: 1,
      pageSize: 5,
      totalItems: 1,
      items: [
        {
          id: 'v1',
          title: 'Rayuela',
          authors: ['Julio Cortázar'],
          publishedDate: '1963',
          thumbnail: 'https://books.google.com/thumb.jpg',
          link: 'https://books.google.com/info',
        },
      ],
    });
  });
});
