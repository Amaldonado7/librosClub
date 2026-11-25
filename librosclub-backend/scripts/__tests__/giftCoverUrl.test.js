const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { ALLOWED_COVER_HOSTS, normalizeCoverUrl, isAllowedCoverUrl } = require('../lib/giftCoverUrl');

describe('giftCoverUrl.normalizeCoverUrl', () => {
  it('pasa http a https', () => {
    const result = normalizeCoverUrl('http://books.google.com/books/content?id=abc&printsec=frontcover&img=1&zoom=1&source=gbs_api');
    assert.ok(result.startsWith('https://books.google.com/'));
    assert.equal(
      result,
      'https://books.google.com/books/content?id=abc&printsec=frontcover&img=1&zoom=1&source=gbs_api',
    );
  });

  it('devuelve null para hosts no permitidos, protocolos no http(s) y valores inválidos', () => {
    for (const value of [
      'https://example.com/tapa.jpg',
      'https://books.google.com.evil.test/x',
      'https://evil.test/?h=books.google.com',
      'javascript:alert(1)',
      'ftp://books.google.com/x',
      'no es una url',
      '',
      null,
      undefined,
      42,
      {},
    ]) {
      assert.equal(normalizeCoverUrl(value), null, String(value));
    }
  });

  it('quita edge=curl y conserva id y el resto de parámetros', () => {
    const result = normalizeCoverUrl('http://books.google.com/books/content?id=abc&printsec=frontcover&img=1&zoom=1&edge=curl&source=gbs_api&edge=curl');
    assert.equal(result.includes('edge=curl'), false);
    assert.equal(
      result,
      'https://books.google.com/books/content?id=abc&printsec=frontcover&img=1&zoom=1&source=gbs_api',
    );
    assert.equal(new URL(result).searchParams.get('id'), 'abc');
  });

  it('conserva otros valores de edge', () => {
    const result = normalizeCoverUrl('https://books.google.com/x?id=abc&edge=flat');
    assert.equal(result, 'https://books.google.com/x?id=abc&edge=flat');
  });

  it('deja igual una URL sin edge salvo el protocolo', () => {
    assert.equal(
      normalizeCoverUrl('https://books.googleusercontent.com/books/content?id=xyz&zoom=1'),
      'https://books.googleusercontent.com/books/content?id=xyz&zoom=1',
    );
  });

  it('rechaza credenciales y puerto aun después de normalizar', () => {
    assert.equal(normalizeCoverUrl('http://user:pw@books.google.com/x'), null);
    assert.equal(normalizeCoverUrl('http://books.google.com:8443/x'), null);
  });
});

describe('giftCoverUrl.isAllowedCoverUrl', () => {
  it('acepta los dos hosts permitidos por https', () => {
    assert.deepEqual(ALLOWED_COVER_HOSTS, ['books.google.com', 'books.googleusercontent.com']);
    assert.equal(isAllowedCoverUrl('https://books.googleusercontent.com/books/content?id=abc'), true);
    assert.equal(isAllowedCoverUrl('https://books.google.com/books/content?id=abc'), true);
    assert.equal(isAllowedCoverUrl('https://BOOKS.GOOGLE.COM/books/content?id=abc'), true);
  });

  it('rechaza http, credenciales, puerto, otros hosts y no-strings', () => {
    for (const value of [
      'http://books.google.com/books/content?id=abc',
      'https://user:pw@books.google.com/x',
      'https://user@books.google.com/x',
      'https://books.google.com:8443/x',
      'https://example.com/x.jpg',
      'https://books.google.com.evil.test/x',
      'https://evil.books.google.com/x',
      'no es una url',
      '',
      null,
      undefined,
      42,
      ['https://books.google.com/x'],
    ]) {
      assert.equal(isAllowedCoverUrl(value), false, String(value));
    }
  });
});
