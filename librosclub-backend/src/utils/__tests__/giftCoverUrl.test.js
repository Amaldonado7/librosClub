const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const giftCoverUrl = require('../giftCoverUrl');

const { ALLOWED_COVER_HOSTS, isAllowedCoverUrl } = giftCoverUrl;

describe('src/utils/giftCoverUrl', () => {
  it('exporta solo la allowlist y la regla', () => {
    assert.deepEqual(Object.keys(giftCoverUrl).sort(), ['ALLOWED_COVER_HOSTS', 'isAllowedCoverUrl']);
    assert.deepEqual(ALLOWED_COVER_HOSTS, ['books.google.com', 'books.googleusercontent.com']);
  });

  it('acepta URLs https de los hosts permitidos', () => {
    assert.equal(isAllowedCoverUrl('https://books.google.com/books/content?id=x'), true);
    assert.equal(isAllowedCoverUrl('https://books.googleusercontent.com/x'), true);
    assert.equal(isAllowedCoverUrl('https://BOOKS.GOOGLE.COM/x'), true);
  });

  it('rechaza protocolos, hosts, puertos, credenciales y valores inválidos sin lanzar', () => {
    for (const value of [
      'http://169.254.169.254/latest',
      'https://evil.example/x.jpg',
      'https://books.google.com:8443/x',
      'https://u:p@books.google.com/x',
      'http://books.google.com/x',
      'https://books.google.com.evil.test/x',
      'no es una url',
      '',
      null,
      undefined,
      123,
      {},
    ]) {
      assert.equal(isAllowedCoverUrl(value), false, String(value));
    }
  });

  it('es la misma función que re-exportan los scripts', () => {
    const scripts = require('../../../scripts/lib/giftCoverUrl');
    assert.equal(scripts.isAllowedCoverUrl, isAllowedCoverUrl);
    assert.equal(scripts.ALLOWED_COVER_HOSTS, ALLOWED_COVER_HOSTS);
    assert.equal(typeof scripts.normalizeCoverUrl, 'function');
  });
});
