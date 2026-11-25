const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { escapeHtml, renderReviewPage } = require('../lib/giftCoverReviewPage');

const COVER_1 = 'https://books.google.com/books/content?id=vol1&printsec=frontcover&img=1&zoom=1';
const COVER_2 = 'https://books.googleusercontent.com/books/content?id=vol2&zoom=1';

function candidate(overrides = {}) {
  return {
    volumeId: 'vol1',
    googleTitle: 'Caballo de fuego',
    googleAuthors: ['Florencia Bonelli'],
    language: 'es',
    publishedDate: '2011',
    coverUrl: COVER_1,
    infoLink: 'https://books.google.com/books?id=vol1',
    ...overrides,
  };
}

function entry(overrides = {}) {
  return {
    id: 1,
    title: 'Caballo de fuego',
    author: 'Florencia Bonelli',
    status: 'found',
    candidates: [candidate()],
    approvedVolumeId: null,
    ...overrides,
  };
}

function count(text, fragment) {
  return text.split(fragment).length - 1;
}

describe('giftCoverReviewPage.renderReviewPage', () => {
  it('muestra una sección por libro con sus candidatos', () => {
    const html = renderReviewPage([
      entry({
        candidates: [
          candidate(),
          candidate({ volumeId: 'vol2', language: 'en', coverUrl: COVER_2 }),
        ],
      }),
      entry({ id: 2, title: 'Romper el círculo', author: 'Colleen Hoover', status: 'not_found', candidates: [] }),
    ]);
    assert.equal(count(html, '<section'), 2);
    assert.ok(html.includes('Caballo de fuego'));
    assert.ok(html.includes('Florencia Bonelli'));
    assert.ok(html.includes('Romper el círculo'));
    assert.ok(html.includes('Colleen Hoover'));
    assert.equal(count(html, '<img'), 2);
    assert.ok(html.includes(`src="${escapeHtml(COVER_1)}"`));
    assert.ok(html.includes(`src="${escapeHtml(COVER_2)}"`));
    assert.ok(html.includes('vol1'));
    assert.ok(html.includes('vol2'));
    assert.ok(html.includes('>es<'));
    assert.ok(html.includes('>en<'));
    assert.ok(html.includes('Sin candidatos'));
    assert.ok(html.startsWith('<!DOCTYPE html>'));
    assert.ok(html.includes('<meta charset="utf-8">'));
  });

  it('escapa todo texto y atributo que viene de Google o del catálogo', () => {
    const html = renderReviewPage([
      entry({
        author: '"><img onerror=x>',
        candidates: [candidate({
          googleTitle: '<script>alert(1)</script>',
          googleAuthors: ['<b>autor</b>'],
          infoLink: 'https://books.google.com/books?id=a"onmouseover="x',
        })],
      }),
    ]);
    assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
    assert.equal(count(html.toLowerCase(), '<script'), 0);
    assert.ok(html.includes('&quot;&gt;&lt;img onerror=x&gt;'));
    assert.equal(html.includes('<img onerror'), false);
    assert.ok(html.includes('&lt;b&gt;autor&lt;/b&gt;'));
    assert.ok(html.includes('href="https://books.google.com/books?id=a&quot;onmouseover=&quot;x"'));
    assert.equal(html.includes('"onmouseover="'), false);
  });

  it('no emite img ni enlaces con URLs no permitidas e incluye la CSP sin scripts', () => {
    const html = renderReviewPage([
      entry({
        candidates: [candidate({
          coverUrl: 'https://example.com/x.jpg',
          infoLink: 'javascript:alert(1)',
        }), candidate({
          volumeId: 'vol3',
          coverUrl: 'http://books.google.com/x',
          infoLink: 'http://books.google.com/books?id=vol3',
        })],
      }),
    ]);
    assert.equal(count(html, '<img'), 0);
    assert.equal(count(html, '<a href'), 0);
    assert.equal(html.includes('example.com'), false);
    assert.equal(html.includes('javascript:'), false);
    const csp = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]*)">/);
    assert.ok(csp, 'falta la meta CSP');
    assert.equal(csp[1], "default-src 'none'; img-src https://books.google.com https://books.googleusercontent.com; style-src 'unsafe-inline'");
    assert.equal(csp[1].includes('script-src'), false);
  });

  it('agrega rel noopener noreferrer al enlace de Google Books', () => {
    const html = renderReviewPage([entry()]);
    assert.ok(html.includes('<a href="https://books.google.com/books?id=vol1" rel="noopener noreferrer">Ver en Google Books</a>'));
  });

  it('muestra el error HTTP y el estado del libro', () => {
    const html = renderReviewPage([
      entry({ status: 'error', httpStatus: 500, candidates: [] }),
      entry({ id: 3, status: 'error', httpStatus: null, candidates: [] }),
    ]);
    assert.ok(html.includes('Error HTTP 500'));
    assert.ok(html.includes('Error de red'));
    assert.ok(html.includes('error'));
  });

  it('no lanza con datos malformados', () => {
    const html = renderReviewPage([
      { id: 9, title: null, author: undefined, status: 'found', candidates: [{ googleAuthors: 'no-array', googleTitle: 42 }] },
      { id: 10, status: 'found', candidates: null },
      null,
    ]);
    assert.equal(count(html, '<section'), 2);
    assert.equal(count(html, '<img'), 0);
  });
});

describe('giftCoverReviewPage.escapeHtml', () => {
  it('escapa los cinco caracteres especiales', () => {
    assert.equal(escapeHtml(`&<>"'`), '&amp;&lt;&gt;&quot;&#39;');
    assert.equal(escapeHtml('a & b'), 'a &amp; b');
  });

  it('devuelve vacío para null y undefined', () => {
    assert.equal(escapeHtml(null), '');
    assert.equal(escapeHtml(undefined), '');
    assert.equal(escapeHtml(42), '42');
  });
});
