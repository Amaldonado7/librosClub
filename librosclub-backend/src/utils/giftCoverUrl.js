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

module.exports = { ALLOWED_COVER_HOSTS, isAllowedCoverUrl };
