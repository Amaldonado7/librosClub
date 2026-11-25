const fs = require('node:fs');
const path = require('node:path');

const { normalizeCoverUrl } = require('./lib/giftCoverUrl');
const { renderReviewPage } = require('./lib/giftCoverReviewPage');

const SEED_JSON = path.join(__dirname, '..', 'migrations', 'seed', 'gift_books.json');
const OUT_DIR = path.join(__dirname, 'out');
const CANDIDATES_FILE = 'gift-cover-candidates.json';
const REVIEW_FILE = 'gift-cover-candidates.html';
const VOLUMES_URL = 'https://www.googleapis.com/books/v1/volumes';
const FIELDS = 'items(id,volumeInfo(title,authors,language,publishedDate,imageLinks/thumbnail,infoLink))';
const MISSING_KEY_MESSAGE = 'GOOGLE_BOOKS_API_KEY no está configurada en .env';
const MAX_CANDIDATES = 3;
const REQUEST_GAP_MS = 250;
const RETRY_DELAY_MS = 2000;
const DEFAULT_TIMEOUT_MS = 10000;

function readApiKey(env) {
  const raw = env ? env.GOOGLE_BOOKS_API_KEY : undefined;
  if (typeof raw !== 'string') return '';
  return raw.trim().replace(/^['"]|['"]$/g, '').trim();
}

function redact(text, key) {
  return key ? String(text).split(key).join('[redactado]') : String(text);
}

function buildSearchUrl({ title, author, langRestrict }) {
  const clean = (value) => String(value).replace(/"/g, '');
  const params = new URLSearchParams({
    q: `intitle:"${clean(title)}" inauthor:"${clean(author)}"`,
    maxResults: '10',
    printType: 'books',
    fields: FIELDS,
  });
  if (langRestrict) params.set('langRestrict', langRestrict);
  return `${VOLUMES_URL}?${params.toString()}`;
}

function thumbnailOf(item) {
  const thumbnail = item && item.volumeInfo && item.volumeInfo.imageLinks
    ? item.volumeInfo.imageLinks.thumbnail
    : undefined;
  return typeof thumbnail === 'string' && thumbnail !== '' ? thumbnail : null;
}

function httpsLink(value) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    url.protocol = 'https:';
    return url.toString();
  } catch {
    return null;
  }
}

function toCandidate(item) {
  const info = item.volumeInfo && typeof item.volumeInfo === 'object' ? item.volumeInfo : {};
  return {
    volumeId: item.id,
    googleTitle: typeof info.title === 'string' ? info.title : '',
    googleAuthors: Array.isArray(info.authors) ? info.authors.filter((a) => typeof a === 'string') : [],
    language: typeof info.language === 'string' ? info.language : null,
    publishedDate: typeof info.publishedDate === 'string' ? info.publishedDate : null,
    coverUrl: normalizeCoverUrl(thumbnailOf(item)),
    infoLink: httpsLink(info.infoLink),
  };
}

function pickCandidates(items) {
  if (!Array.isArray(items)) return [];
  const seen = new Set();
  const candidates = [];
  for (const item of items) {
    if (!item || typeof item !== 'object' || typeof item.id !== 'string' || item.id === '') continue;
    if (seen.has(item.id)) continue;
    const candidate = toCandidate(item);
    if (!candidate.coverUrl) continue;
    seen.add(item.id);
    candidates.push(candidate);
  }
  const spanish = candidates.filter((c) => c.language === 'es');
  const others = candidates.filter((c) => c.language !== 'es');
  return [...spanish, ...others].slice(0, MAX_CANDIDATES);
}

function isRetryable(result) {
  return result.kind === 'network' || (result.kind === 'http' && (result.status === 429 || result.status >= 500));
}

function isFatal(result) {
  return result.kind === 'http' && result.status >= 400 && result.status < 500 && result.status !== 429;
}

function createRequester({ fetchImpl, sleep, timeoutMs, createAbortController, budget, apiKey }) {
  let made = 0;
  async function request(url) {
    if (made >= budget) return { kind: 'budget' };
    if (made > 0) await sleep(REQUEST_GAP_MS);
    made += 1;
    const controller = createAbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(url, {
        signal: controller.signal,
        headers: { 'X-Goog-Api-Key': apiKey },
      });
      if (response.status < 200 || response.status > 299) return { kind: 'http', status: response.status };
      const body = await response.text();
      try {
        const data = JSON.parse(body);
        return { kind: 'ok', items: data && Array.isArray(data.items) ? data.items : [] };
      } catch {
        return { kind: 'invalid', status: response.status };
      }
    } catch (err) {
      return { kind: 'network', timeout: Boolean(err && err.name === 'AbortError') };
    } finally {
      clearTimeout(timer);
    }
  }
  return async function attempt(url) {
    const first = await request(url);
    if (!isRetryable(first)) return first;
    await sleep(RETRY_DELAY_MS);
    return request(url);
  };
}

function failureOf(result) {
  if (result.kind === 'http' || result.kind === 'invalid') {
    return { httpStatus: result.status, detail: `error HTTP ${result.status}` };
  }
  if (result.kind === 'budget') return { httpStatus: null, detail: 'error: presupuesto de requests agotado' };
  return { httpStatus: null, detail: result.timeout ? 'timeout' : 'error de red' };
}

async function searchBook(book, { attempt }) {
  const base = { title: book.title, author: book.author };
  let result = await attempt(buildSearchUrl({ ...base, langRestrict: 'es' }));
  if (result.kind === 'ok' && !result.items.some(thumbnailOf)) {
    result = await attempt(buildSearchUrl({ ...base, langRestrict: null }));
  }
  return result;
}

function writeOutputs(outDir, entries, apiKey) {
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, CANDIDATES_FILE), redact(`${JSON.stringify(entries, null, 2)}\n`, apiKey));
  fs.writeFileSync(path.join(outDir, REVIEW_FILE), redact(renderReviewPage(entries), apiKey));
}

async function run({
  env = process.env,
  fetchImpl,
  sleep,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  createAbortController = () => new AbortController(),
  seedPath = SEED_JSON,
  outDir = OUT_DIR,
  log = console.log,
  error = console.error,
} = {}) {
  const apiKey = readApiKey(env);
  if (!apiKey) {
    error(MISSING_KEY_MESSAGE);
    return 1;
  }
  const say = (message) => log(redact(message, apiKey));
  const warn = (message) => error(redact(message, apiKey));

  let books;
  try {
    books = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
    if (!Array.isArray(books)) throw new Error('catálogo inválido');
  } catch {
    warn(`No se pudo leer ${path.basename(seedPath)}: revisá que exista y sea un array JSON`);
    return 1;
  }

  const pending = books.filter((book) => book && book.coverUrl === null).sort((a, b) => a.id - b.id);
  const attempt = createRequester({
    fetchImpl, sleep, timeoutMs, createAbortController, budget: 2 * pending.length, apiKey,
  });
  const entries = [];
  const counts = { found: 0, not_found: 0, error: 0 };

  for (const book of pending) {
    const result = await searchBook(book, { attempt });
    if (isFatal(result)) {
      warn(`Google Books respondió ${result.status}: se corta la corrida`);
      writeOutputs(outDir, entries, apiKey);
      return 1;
    }
    const entry = { id: book.id, title: book.title, author: book.author };
    if (result.kind === 'ok') {
      const candidates = pickCandidates(result.items);
      const status = candidates.length > 0 ? 'found' : 'not_found';
      Object.assign(entry, { status, candidates, approvedVolumeId: null });
      say(`#${book.id} ${book.title}: ${status === 'found' ? `found (${candidates.length})` : 'not_found'}`);
    } else {
      const failure = failureOf(result);
      Object.assign(entry, {
        status: 'error', candidates: [], approvedVolumeId: null, httpStatus: failure.httpStatus,
      });
      say(`#${book.id} ${book.title}: ${failure.detail}`);
    }
    counts[entry.status] += 1;
    entries.push(entry);
  }

  writeOutputs(outDir, entries, apiKey);
  say(`Resumen: found ${counts.found}, not_found ${counts.not_found}, error ${counts.error}`);
  return counts.error > 0 ? 2 : 0;
}

if (require.main === module) {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  const { promisify } = require('node:util');
  run({
    env: process.env,
    fetchImpl: globalThis.fetch,
    sleep: promisify(setTimeout),
  }).then((code) => {
    process.exitCode = code;
  });
}

module.exports = {
  run, readApiKey, buildSearchUrl, pickCandidates, redact, CANDIDATES_FILE, REVIEW_FILE,
};
