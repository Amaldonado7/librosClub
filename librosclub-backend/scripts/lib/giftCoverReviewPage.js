const { isAllowedCoverUrl } = require('./giftCoverUrl');

const HTML_ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const CONTENT_SECURITY_POLICY = "default-src 'none'; img-src https://books.google.com https://books.googleusercontent.com; style-src 'unsafe-inline'";

const STYLES = [
  'body { font-family: sans-serif; margin: 2rem; color: #222; }',
  'section { border-top: 1px solid #ccc; padding: 1rem 0; }',
  '.candidates { display: flex; flex-wrap: wrap; gap: 1rem; }',
  'figure { margin: 0; width: 12rem; }',
  'img { max-width: 100%; height: auto; display: block; }',
  'dt { font-weight: bold; }',
].join('\n');

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => HTML_ENTITIES[char]);
}

function textOf(value) {
  return typeof value === 'string' || typeof value === 'number' ? escapeHtml(value) : '';
}

function authorsOf(value) {
  return Array.isArray(value) ? escapeHtml(value.filter((author) => typeof author === 'string').join(', ')) : '';
}

function renderCandidate(candidate) {
  if (!candidate || typeof candidate !== 'object') return '';
  const image = isAllowedCoverUrl(candidate.coverUrl)
    ? `<img src="${escapeHtml(candidate.coverUrl)}" alt="${textOf(candidate.googleTitle)}">`
    : '';
  const link = typeof candidate.infoLink === 'string' && candidate.infoLink.startsWith('https://')
    ? `<a href="${escapeHtml(candidate.infoLink)}" rel="noopener noreferrer">Ver en Google Books</a>`
    : '';
  return [
    '<figure>',
    image,
    '<figcaption><dl>',
    `<dt>volumeId</dt><dd>${textOf(candidate.volumeId)}</dd>`,
    `<dt>Idioma</dt><dd>${textOf(candidate.language)}</dd>`,
    `<dt>Título</dt><dd>${textOf(candidate.googleTitle)}</dd>`,
    `<dt>Autores</dt><dd>${authorsOf(candidate.googleAuthors)}</dd>`,
    `<dt>Fecha</dt><dd>${textOf(candidate.publishedDate)}</dd>`,
    '</dl>',
    link,
    '</figcaption>',
    '</figure>',
  ].join('\n');
}

function renderBody(entry, candidates) {
  if (entry.status === 'error') {
    return Number.isInteger(entry.httpStatus)
      ? `<p>Error HTTP ${escapeHtml(entry.httpStatus)}</p>`
      : '<p>Error de red</p>';
  }
  if (candidates.length === 0) return '<p>Sin candidatos</p>';
  return `<div class="candidates">\n${candidates.map(renderCandidate).join('\n')}\n</div>`;
}

function renderEntry(entry) {
  const candidates = Array.isArray(entry.candidates) ? entry.candidates : [];
  return [
    '<section>',
    `<h2>#${textOf(entry.id)} ${textOf(entry.title)} — ${textOf(entry.author)}</h2>`,
    `<p>Estado: ${textOf(entry.status)}</p>`,
    renderBody(entry, candidates),
    '</section>',
  ].join('\n');
}

function renderReviewPage(entries) {
  const sections = (Array.isArray(entries) ? entries : [])
    .filter((entry) => entry && typeof entry === 'object')
    .map(renderEntry);
  return [
    '<!DOCTYPE html>',
    '<html lang="es">',
    '<head>',
    '<meta charset="utf-8">',
    `<meta http-equiv="Content-Security-Policy" content="${CONTENT_SECURITY_POLICY}">`,
    '<title>Portadas del catálogo de regalo</title>',
    `<style>\n${STYLES}\n</style>`,
    '</head>',
    '<body>',
    '<h1>Portadas del catálogo de regalo</h1>',
    ...sections,
    '</body>',
    '</html>',
    '',
  ].join('\n');
}

module.exports = { escapeHtml, renderReviewPage };
