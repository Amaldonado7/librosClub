const ALLOWED_COVER_HOSTS = ['books.google.com', 'books.googleusercontent.com'];

function parseUrl(value) {
  if (typeof value !== 'string' || value === '') return null;
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isAllowedCoverUrl(url) {
  const parsed = parseUrl(url);
  if (!parsed) return false;
  return parsed.protocol === 'https:'
    && ALLOWED_COVER_HOSTS.includes(parsed.hostname.toLowerCase())
    && parsed.username === ''
    && parsed.password === ''
    && parsed.port === ''
    && url.startsWith('https://');
}

function withoutCurlEdge(url) {
  const entries = [...url.searchParams];
  const kept = entries.filter(([name, value]) => !(name === 'edge' && value === 'curl'));
  if (kept.length !== entries.length) {
    url.search = new URLSearchParams(kept).toString();
  }
  return url;
}

function normalizeCoverUrl(raw) {
  const parsed = parseUrl(raw);
  if (!parsed) return null;
  if (parsed.protocol === 'http:') parsed.protocol = 'https:';
  if (parsed.protocol !== 'https:') return null;
  const result = withoutCurlEdge(parsed).toString();
  return isAllowedCoverUrl(result) ? result : null;
}

module.exports = { ALLOWED_COVER_HOSTS, normalizeCoverUrl, isAllowedCoverUrl };
